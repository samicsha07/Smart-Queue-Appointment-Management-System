from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional
from datetime import date, datetime

from backend.app.database import get_db
from backend.app.models.queue_token import QueueToken
from backend.app.models.service_centre import ServiceCentre
from backend.app.models.service_category import ServiceCategory
from backend.app.models.user import User
from backend.app.models.appointment import Appointment
from backend.app.schemas.queue import (
    QueueTokenOut, LiveQueueStatus, QueueActionRequest
)
from backend.app.services.auth_service import get_current_user, get_current_admin
from backend.app.services.queue_service import (
    calculate_queue_position,
    call_next_customer,
    update_token_status_service,
    generate_next_token
)
from backend.app.services.notification_service import create_and_send_notification
from backend.app.services.websocket_manager import manager

router = APIRouter(prefix="/queue", tags=["Queue Management"])

@router.get("/live/{token_id}", response_model=LiveQueueStatus)
def get_live_queue_status(
    token_id: int,
    db: Session = Depends(get_db)
):
    """
    Returns real-time queue position, currently serving token,
    number of customers ahead, and recalculated estimated waiting time.
    """
    token = db.query(QueueToken).filter(QueueToken.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Queue token not found")

    status_data = calculate_queue_position(db, token)
    return status_data

@router.get("/active", response_model=List[QueueTokenOut])
def get_active_queue_tokens(
    centre_id: int,
    operating_date: Optional[date] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Returns all queue tokens for a centre and operating date, sorted by sequence number.
    Used by the administrator live queue table.
    """
    target_date = operating_date or date.today()
    query = db.query(QueueToken).filter(
        and_(
            QueueToken.centre_id == centre_id,
            QueueToken.operating_date == target_date
        )
    )

    if category_id:
        query = query.filter(QueueToken.category_id == category_id)

    tokens = query.order_by(QueueToken.sequence_number.asc()).all()

    result = []
    for t in tokens:
        user_name = t.user.name if t.user else "Walk-in Customer"
        user_phone = t.user.phone if t.user else "N/A"
        app_time = t.appointment.appointment_time if t.appointment else "Walk-in"

        result.append({
            "id": t.id,
            "token_number": t.token_number,
            "sequence_number": t.sequence_number,
            "appointment_id": t.appointment_id,
            "user_id": t.user_id,
            "user_name": user_name,
            "user_phone": user_phone,
            "centre_id": t.centre_id,
            "centre_name": t.centre.name if t.centre else "Centre",
            "category_id": t.category_id,
            "category_name": t.category.name if t.category else "Category",
            "operating_date": t.operating_date,
            "status": t.status,
            "called_at": t.called_at,
            "served_at": t.served_at,
            "completed_at": t.completed_at,
            "created_at": t.created_at,
            "appointment_time": app_time
        })
    return result

@router.post("/action")
async def perform_queue_action(
    payload: QueueActionRequest,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Admin actions:
    - 'call_next': completes currently serving and calls the next waiting token
    - 'mark_serving', 'mark_completed', 'mark_skipped', 'mark_cancelled': updates specific token
    """
    if payload.action == "call_next":
        next_token = await call_next_customer(
            db=db,
            centre_id=payload.centre_id,
            category_id=payload.category_id
        )
        if not next_token:
            return {"message": "No customers currently waiting in this queue."}
        return {
            "message": f"Called next customer: Token {next_token.token_number}",
            "token_id": next_token.id,
            "token_number": next_token.token_number,
            "status": next_token.status
        }

    if not payload.token_id:
        raise HTTPException(status_code=400, detail="token_id is required for this action")

    status_mapping = {
        "mark_serving": "serving",
        "mark_completed": "completed",
        "mark_skipped": "skipped",
        "mark_cancelled": "cancelled"
    }

    new_status = status_mapping.get(payload.action)
    if not new_status:
        raise HTTPException(status_code=400, detail=f"Invalid action '{payload.action}'")

    updated_token = await update_token_status_service(
        db=db,
        token_id=payload.token_id,
        new_status=new_status
    )

    return {
        "message": f"Token {updated_token.token_number} marked as {new_status}.",
        "token_id": updated_token.id,
        "token_number": updated_token.token_number,
        "status": updated_token.status
    }

@router.post("/walkin")
async def generate_walkin_token(
    centre_id: int,
    category_id: int,
    customer_name: Optional[str] = "Walk-in Guest",
    customer_phone: Optional[str] = "N/A",
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    """
    Admin generates a walk-in token for visitors without a pre-booked web appointment.
    """
    today = date.today()
    token = generate_next_token(
        db=db,
        centre_id=centre_id,
        category_id=category_id,
        operating_date=today,
        user_id=None,
        appointment_id=None
    )

    # Broadcast update
    await manager.broadcast({
        "event": "QUEUE_UPDATED",
        "centre_id": centre_id,
        "token_number": token.token_number,
        "action": "walkin_created",
        "timestamp": datetime.utcnow().isoformat()
    })

    return {
        "message": f"Walk-in token {token.token_number} generated successfully.",
        "token": {
            "id": token.id,
            "token_number": token.token_number,
            "sequence_number": token.sequence_number,
            "status": token.status,
            "operating_date": token.operating_date,
            "customer_name": customer_name,
            "customer_phone": customer_phone
        }
    }
