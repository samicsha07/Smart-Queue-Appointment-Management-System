from datetime import date, datetime
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from fastapi import HTTPException, status

from backend.app.models.queue_token import QueueToken
from backend.app.models.service_category import ServiceCategory
from backend.app.models.service_centre import ServiceCentre
from backend.app.models.appointment import Appointment
from backend.app.services.websocket_manager import manager
from backend.app.services.notification_service import create_and_send_notification

def generate_next_token(
    db: Session,
    centre_id: int,
    category_id: int,
    operating_date: date,
    user_id: Optional[int] = None,
    appointment_id: Optional[int] = None
) -> QueueToken:
    """
    Generates a sequential token number for the given service centre and operating date.
    Uses category token prefix (e.g., A001, B002).
    """
    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Service category not found")

    prefix = category.token_prefix.strip().upper() if category.token_prefix else "A"

    # Find the current highest sequence number for this centre and date
    max_seq = db.query(func.max(QueueToken.sequence_number)).filter(
        and_(
            QueueToken.centre_id == centre_id,
            QueueToken.operating_date == operating_date
        )
    ).scalar()

    next_seq = (max_seq or 0) + 1
    token_str = f"{prefix}{next_seq:03d}"

    # Verify uniqueness in this centre & date (handle edge case)
    while db.query(QueueToken).filter(
        and_(
            QueueToken.centre_id == centre_id,
            QueueToken.operating_date == operating_date,
            QueueToken.token_number == token_str
        )
    ).first() is not None:
        next_seq += 1
        token_str = f"{prefix}{next_seq:03d}"

    token = QueueToken(
        token_number=token_str,
        sequence_number=next_seq,
        appointment_id=appointment_id,
        user_id=user_id,
        centre_id=centre_id,
        category_id=category_id,
        operating_date=operating_date,
        status="waiting"
    )
    db.add(token)
    db.commit()
    db.refresh(token)
    return token

def calculate_queue_position(
    db: Session,
    token: QueueToken
) -> dict:
    """
    Computes real-time queue position, currently serving token, people ahead,
    and estimated waiting time.
    """
    centre = db.query(ServiceCentre).filter(ServiceCentre.id == token.centre_id).first()
    category = db.query(ServiceCategory).filter(ServiceCategory.id == token.category_id).first()
    avg_duration = category.avg_duration_minutes if category else 15

    # Find currently serving token in this centre
    currently_serving = db.query(QueueToken).filter(
        and_(
            QueueToken.centre_id == token.centre_id,
            QueueToken.operating_date == token.operating_date,
            QueueToken.status == "serving"
        )
    ).order_by(QueueToken.called_at.desc()).first()

    currently_serving_str = currently_serving.token_number if currently_serving else "None"

    # If token is completed, skipped, or cancelled
    if token.status in ["completed", "skipped", "cancelled"]:
        return {
            "token_id": token.id,
            "token_number": token.token_number,
            "centre_id": token.centre_id,
            "centre_name": centre.name if centre else "Service Centre",
            "category_id": token.category_id,
            "category_name": category.name if category else "General Service",
            "currently_serving_token": currently_serving_str,
            "people_ahead": 0,
            "estimated_waiting_time_minutes": 0,
            "status": token.status,
            "appointment_date": token.operating_date,
            "appointment_time": token.appointment.appointment_time if token.appointment else "Walk-in"
        }

    # If token is actively being served
    if token.status == "serving":
        return {
            "token_id": token.id,
            "token_number": token.token_number,
            "centre_id": token.centre_id,
            "centre_name": centre.name if centre else "Service Centre",
            "category_id": token.category_id,
            "category_name": category.name if category else "General Service",
            "currently_serving_token": token.token_number,
            "people_ahead": 0,
            "estimated_waiting_time_minutes": 0,
            "status": "serving",
            "appointment_date": token.operating_date,
            "appointment_time": token.appointment.appointment_time if token.appointment else "Walk-in"
        }

    # If token is waiting:
    # Count waiting customers ahead with sequence_number < token.sequence_number
    people_ahead = db.query(func.count(QueueToken.id)).filter(
        and_(
            QueueToken.centre_id == token.centre_id,
            QueueToken.operating_date == token.operating_date,
            QueueToken.category_id == token.category_id,
            QueueToken.status == "waiting",
            QueueToken.sequence_number < token.sequence_number
        )
    ).scalar() or 0

    serving_in_cat = db.query(QueueToken).filter(
        and_(
            QueueToken.centre_id == token.centre_id,
            QueueToken.category_id == token.category_id,
            QueueToken.operating_date == token.operating_date,
            QueueToken.status == "serving"
        )
    ).first()
    
    additional_multiplier = 1 if serving_in_cat else 0
    estimated_waiting_time = (people_ahead + additional_multiplier) * avg_duration

    return {
        "token_id": token.id,
        "token_number": token.token_number,
        "centre_id": token.centre_id,
        "centre_name": centre.name if centre else "Service Centre",
        "category_id": token.category_id,
        "category_name": category.name if category else "General Service",
        "currently_serving_token": currently_serving_str,
        "people_ahead": people_ahead,
        "estimated_waiting_time_minutes": estimated_waiting_time,
        "status": token.status,
        "appointment_date": token.operating_date,
        "appointment_time": token.appointment.appointment_time if token.appointment else "Walk-in"
    }

async def call_next_customer(
    db: Session,
    centre_id: int,
    category_id: Optional[int] = None
) -> Optional[QueueToken]:
    """
    Finds the next waiting token and transitions it to 'serving'.
    Marks any currently serving token as 'completed'.
    Sends notifications and broadcasts WebSocket event.
    """
    today = date.today()

    # Automatically complete any currently serving token in this centre
    serving_query = db.query(QueueToken).filter(
        and_(
            QueueToken.centre_id == centre_id,
            QueueToken.operating_date == today,
            QueueToken.status == "serving"
        )
    )
    if category_id:
        serving_query = serving_query.filter(QueueToken.category_id == category_id)

    curr_serving = serving_query.first()
    if curr_serving:
        curr_serving.status = "completed"
        curr_serving.completed_at = datetime.utcnow()
        if curr_serving.appointment:
            curr_serving.appointment.status = "completed"
        db.commit()

    # Find the next waiting customer (lowest sequence_number)
    waiting_query = db.query(QueueToken).filter(
        and_(
            QueueToken.centre_id == centre_id,
            QueueToken.operating_date == today,
            QueueToken.status == "waiting"
        )
    )
    if category_id:
        waiting_query = waiting_query.filter(QueueToken.category_id == category_id)

    next_token = waiting_query.order_by(QueueToken.sequence_number.asc()).first()
    if not next_token:
        # Broadcast that queue is empty
        await manager.broadcast({
            "event": "QUEUE_UPDATED",
            "centre_id": centre_id,
            "message": "No waiting customers in queue"
        })
        return None

    next_token.status = "serving"
    next_token.called_at = datetime.utcnow()
    next_token.served_at = datetime.utcnow()
    if next_token.appointment:
        next_token.appointment.status = "confirmed"
    db.commit()
    db.refresh(next_token)

    # Send Notification to customer being called
    if next_token.user_id:
        await create_and_send_notification(
            db=db,
            user_id=next_token.user_id,
            title="Your Turn Now!",
            message=f"Token {next_token.token_number} is now being called to the counter. Please proceed immediately.",
            type="serving",
            appointment_id=next_token.appointment_id,
            token_id=next_token.id
        )

    # Check the next 2 waiting customers and notify them their turn is approaching
    upcoming_data = db.query(
        QueueToken.id, QueueToken.user_id, QueueToken.token_number, QueueToken.appointment_id
    ).filter(
        and_(
            QueueToken.centre_id == centre_id,
            QueueToken.operating_date == today,
            QueueToken.status == "waiting",
            QueueToken.id != next_token.id
        )
    ).order_by(QueueToken.sequence_number.asc()).limit(2).all()

    for idx, (t_id, u_id, t_num, app_id) in enumerate(upcoming_data):
        if u_id:
            ahead_count = idx + 1
            await create_and_send_notification(
                db=db,
                user_id=u_id,
                title="Your Turn Is Approaching!",
                message=f"Only {ahead_count} customer{'s' if ahead_count > 1 else ''} ahead of your token ({t_num}). Please be ready near the waiting area.",
                type="approaching",
                appointment_id=app_id,
                token_id=t_id
            )

    # Broadcast real-time queue update to all connected clients
    await manager.broadcast({
        "event": "QUEUE_UPDATED",
        "centre_id": centre_id,
        "token_number": next_token.token_number,
        "status": "serving",
        "timestamp": datetime.utcnow().isoformat()
    })

    return next_token

async def update_token_status_service(
    db: Session,
    token_id: int,
    new_status: str
) -> QueueToken:
    """
    Updates token status ('serving', 'completed', 'skipped', 'cancelled')
    and handles side effects.
    """
    token = db.query(QueueToken).filter(QueueToken.id == token_id).first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")

    old_status = token.status
    token.status = new_status
    now = datetime.utcnow()

    user_id = token.user_id
    token_number = token.token_number
    appointment_id = token.appointment_id

    if new_status == "serving":
        token.served_at = now
        token.called_at = now
        if token.appointment:
            token.appointment.status = "confirmed"
    elif new_status == "completed":
        token.completed_at = now
        if token.appointment:
            token.appointment.status = "completed"
    elif new_status == "cancelled":
        if token.appointment:
            token.appointment.status = "cancelled"
    
    db.commit()
    db.refresh(token)

    if user_id:
        if new_status == "serving":
            await create_and_send_notification(
                db=db,
                user_id=user_id,
                title="Your Turn Now!",
                message=f"Token {token_number} is now being called to the counter.",
                type="serving",
                appointment_id=appointment_id,
                token_id=token.id
            )
        elif new_status == "cancelled":
            await create_and_send_notification(
                db=db,
                user_id=user_id,
                title="Appointment / Token Cancelled",
                message=f"Token {token_number} has been cancelled.",
                type="cancellation",
                appointment_id=appointment_id,
                token_id=token.id
            )
        elif new_status == "skipped":
            await create_and_send_notification(
                db=db,
                user_id=user_id,
                title="Token Skipped",
                message=f"Token {token_number} was called but skipped. Please contact the front desk if you have arrived.",
                type="info",
                appointment_id=appointment_id,
                token_id=token.id
            )

    # Broadcast change
    await manager.broadcast({
        "event": "QUEUE_UPDATED",
        "centre_id": token.centre_id,
        "token_number": token.token_number,
        "status": token.status,
        "timestamp": now.isoformat()
    })

    return token
