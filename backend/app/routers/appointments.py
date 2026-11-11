from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import date, datetime

from backend.app.database import get_db
from backend.app.models.appointment import Appointment
from backend.app.models.queue_token import QueueToken
from backend.app.models.service_slot import ServiceSlot
from backend.app.models.service_centre import ServiceCentre
from backend.app.models.service_category import ServiceCategory
from backend.app.models.user import User
from backend.app.schemas.appointment import AppointmentCreate, AppointmentOut
from backend.app.services.auth_service import get_current_user, get_current_admin
from backend.app.services.queue_service import generate_next_token
from backend.app.services.notification_service import create_and_send_notification
from backend.app.services.websocket_manager import manager

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.post("/book", response_model=AppointmentOut)
async def book_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate Service Centre and Category
    centre = db.query(ServiceCentre).filter(ServiceCentre.id == payload.centre_id, ServiceCentre.is_active == True).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Selected service centre does not exist or is inactive.")

    category = db.query(ServiceCategory).filter(
        ServiceCategory.id == payload.category_id,
        ServiceCategory.centre_id == payload.centre_id,
        ServiceCategory.is_active == True
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Selected service category not found in this service centre.")

    # 2. Prevent duplicate booking for the same user on the same date and category
    existing_booking = db.query(Appointment).filter(
        and_(
            Appointment.user_id == current_user.id,
            Appointment.centre_id == payload.centre_id,
            Appointment.appointment_date == payload.appointment_date,
            Appointment.status.in_(["booked", "confirmed"])
        )
    ).first()
    if existing_booking:
        raise HTTPException(
            status_code=400,
            detail=f"You already have an active appointment scheduled at {centre.name} on {payload.appointment_date}."
        )

    # 3. Check Slot Availability if slot_id provided
    slot = None
    if payload.slot_id:
        slot = db.query(ServiceSlot).filter(ServiceSlot.id == payload.slot_id).first()
        if not slot:
            raise HTTPException(status_code=404, detail="Selected time slot was not found.")
        
        # Count current active bookings in this slot
        active_in_slot = db.query(Appointment).filter(
            and_(
                Appointment.slot_id == slot.id,
                Appointment.status.in_(["booked", "confirmed"])
            )
        ).count()

        if active_in_slot >= slot.max_capacity:
            raise HTTPException(
                status_code=400,
                detail="This time slot has reached maximum capacity. Please choose another slot."
            )

    # 4. Create the Appointment
    appointment = Appointment(
        user_id=current_user.id,
        centre_id=payload.centre_id,
        category_id=payload.category_id,
        slot_id=payload.slot_id,
        appointment_date=payload.appointment_date,
        appointment_time=payload.appointment_time,
        status="booked",
        notes=payload.notes
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    # 5. Automatically generate Digital Queue Token
    token = generate_next_token(
        db=db,
        centre_id=payload.centre_id,
        category_id=payload.category_id,
        operating_date=payload.appointment_date,
        user_id=current_user.id,
        appointment_id=appointment.id
    )

    # 6. Create in-app notifications
    await create_and_send_notification(
        db=db,
        user_id=current_user.id,
        title="Appointment Confirmed!",
        message=f"Your appointment at {centre.name} for '{category.name}' on {payload.appointment_date} at {payload.appointment_time} is confirmed.",
        type="booking",
        appointment_id=appointment.id,
        token_id=token.id
    )

    await create_and_send_notification(
        db=db,
        user_id=current_user.id,
        title="Queue Token Issued",
        message=f"Digital Queue Token #{token.token_number} has been generated for your visit. Keep track of your live position in the dashboard.",
        type="token",
        appointment_id=appointment.id,
        token_id=token.id
    )

    # 7. Broadcast queue update
    await manager.broadcast({
        "event": "NEW_BOOKING",
        "centre_id": payload.centre_id,
        "token_number": token.token_number,
        "operating_date": str(payload.appointment_date)
    })

    return {
        "id": appointment.id,
        "user_id": appointment.user_id,
        "centre_id": appointment.centre_id,
        "category_id": appointment.category_id,
        "slot_id": appointment.slot_id,
        "appointment_date": appointment.appointment_date,
        "appointment_time": appointment.appointment_time,
        "status": appointment.status,
        "notes": appointment.notes,
        "created_at": appointment.created_at,
        "centre_name": centre.name,
        "category_name": category.name,
        "user_name": current_user.name,
        "user_phone": current_user.phone,
        "token": {
            "id": token.id,
            "token_number": token.token_number,
            "sequence_number": token.sequence_number,
            "status": token.status,
            "operating_date": token.operating_date
        }
    }

@router.get("/my")
def get_customer_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns active appointments and history for the logged-in customer.
    """
    appointments = db.query(Appointment).filter(
        Appointment.user_id == current_user.id
    ).order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).all()

    active = []
    history = []

    for app in appointments:
        app_data = {
            "id": app.id,
            "user_id": app.user_id,
            "centre_id": app.centre_id,
            "category_id": app.category_id,
            "slot_id": app.slot_id,
            "appointment_date": app.appointment_date,
            "appointment_time": app.appointment_time,
            "status": app.status,
            "notes": app.notes,
            "created_at": app.created_at,
            "centre_name": app.centre.name if app.centre else "Unknown Centre",
            "category_name": app.category.name if app.category else "Unknown Category",
            "token": {
                "id": app.token.id,
                "token_number": app.token.token_number,
                "sequence_number": app.token.sequence_number,
                "status": app.token.status,
                "operating_date": app.token.operating_date
            } if app.token else None
        }

        if app.status in ["booked", "confirmed"]:
            active.append(app_data)
        else:
            history.append(app_data)

    return {
        "active": active,
        "history": history
    }

@router.get("/my/active-token")
def get_customer_active_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the most recent active token for today/upcoming appointment for live tracking.
    """
    today = date.today()
    token = db.query(QueueToken).filter(
        and_(
            QueueToken.user_id == current_user.id,
            QueueToken.status.in_(["waiting", "serving"])
        )
    ).order_by(QueueToken.operating_date.asc(), QueueToken.sequence_number.asc()).first()

    if not token:
        return {"active_token": None}

    return {"active_token_id": token.id}

@router.post("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to cancel this appointment.")

    if appointment.status in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel an appointment that is already {appointment.status}.")

    appointment.status = "cancelled"
    
    # Also cancel associated queue token so it is removed from the active queue
    if appointment.token:
        appointment.token.status = "cancelled"

    db.commit()

    # Send Notification
    await create_and_send_notification(
        db=db,
        user_id=current_user.id,
        title="Appointment Cancelled",
        message=f"Your appointment at {appointment.centre.name if appointment.centre else 'the centre'} scheduled on {appointment.appointment_date} has been successfully cancelled.",
        type="cancellation",
        appointment_id=appointment.id,
        token_id=appointment.token.id if appointment.token else None
    )

    # Broadcast queue update
    await manager.broadcast({
        "event": "QUEUE_UPDATED",
        "centre_id": appointment.centre_id,
        "action": "appointment_cancelled",
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"message": "Appointment cancelled successfully."}

@router.get("/all")
def get_all_appointments_admin(
    centre_id: Optional[int] = None,
    operating_date: Optional[date] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    query = db.query(Appointment)
    if centre_id:
        query = query.filter(Appointment.centre_id == centre_id)
    if operating_date:
        query = query.filter(Appointment.appointment_date == operating_date)
    if status_filter:
        query = query.filter(Appointment.status == status_filter)

    appointments = query.order_by(Appointment.appointment_date.desc(), Appointment.appointment_time.desc()).all()

    result = []
    for app in appointments:
        result.append({
            "id": app.id,
            "user_id": app.user_id,
            "user_name": app.user.name if app.user else "Walk-in Customer",
            "user_phone": app.user.phone if app.user else "N/A",
            "user_email": app.user.email if app.user else "N/A",
            "centre_id": app.centre_id,
            "centre_name": app.centre.name if app.centre else "Unknown",
            "category_id": app.category_id,
            "category_name": app.category.name if app.category else "Unknown",
            "appointment_date": app.appointment_date,
            "appointment_time": app.appointment_time,
            "status": app.status,
            "notes": app.notes,
            "token": {
                "id": app.token.id,
                "token_number": app.token.token_number,
                "sequence_number": app.token.sequence_number,
                "status": app.token.status
            } if app.token else None,
            "created_at": app.created_at
        })
    return result
