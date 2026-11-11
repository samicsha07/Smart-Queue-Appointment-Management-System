from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta

from backend.app.database import get_db
from backend.app.models.service_centre import ServiceCentre
from backend.app.models.service_category import ServiceCategory
from backend.app.models.service_slot import ServiceSlot
from backend.app.models.appointment import Appointment
from backend.app.schemas.service import (
    ServiceCentreCreate, ServiceCentreUpdate, ServiceCentreOut,
    ServiceCategoryCreate, ServiceCategoryUpdate, ServiceCategoryOut,
    ServiceSlotOut
)
from backend.app.services.auth_service import get_current_admin

router = APIRouter(prefix="/services", tags=["Services & Centres"])

# ----------------- Service Centres -----------------

@router.get("/centres", response_model=List[ServiceCentreOut])
def get_service_centres(
    city: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ServiceCentre).filter(ServiceCentre.is_active == True)
    if city:
        query = query.filter(ServiceCentre.city.ilike(f"%{city}%"))
    if type:
        query = query.filter(ServiceCentre.type == type)
    centres = query.all()
    return centres

@router.get("/centres/{centre_id}", response_model=ServiceCentreOut)
def get_service_centre(centre_id: int, db: Session = Depends(get_db)):
    centre = db.query(ServiceCentre).filter(ServiceCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Service Centre not found")
    return centre

@router.post("/centres", response_model=ServiceCentreOut)
def create_service_centre(
    payload: ServiceCentreCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    centre = ServiceCentre(**payload.model_dump())
    db.add(centre)
    db.commit()
    db.refresh(centre)
    return centre

@router.put("/centres/{centre_id}", response_model=ServiceCentreOut)
def update_service_centre(
    centre_id: int,
    payload: ServiceCentreUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    centre = db.query(ServiceCentre).filter(ServiceCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Service Centre not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(centre, key, value)

    db.commit()
    db.refresh(centre)
    return centre

@router.delete("/centres/{centre_id}")
def delete_service_centre(
    centre_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    centre = db.query(ServiceCentre).filter(ServiceCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Service Centre not found")
    db.delete(centre)
    db.commit()
    return {"message": "Service Centre deleted successfully"}

# ----------------- Service Categories -----------------

@router.get("/categories", response_model=List[ServiceCategoryOut])
def get_service_categories(
    centre_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ServiceCategory).filter(ServiceCategory.is_active == True)
    if centre_id:
        query = query.filter(ServiceCategory.centre_id == centre_id)
    return query.all()

@router.post("/categories", response_model=ServiceCategoryOut)
def create_service_category(
    payload: ServiceCategoryCreate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    category = ServiceCategory(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/categories/{category_id}", response_model=ServiceCategoryOut)
def update_service_category(
    category_id: int,
    payload: ServiceCategoryUpdate,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Service Category not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category

@router.delete("/categories/{category_id}")
def delete_service_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin = Depends(get_current_admin)
):
    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Service Category not found")
    db.delete(category)
    db.commit()
    return {"message": "Service Category deleted successfully"}

# ----------------- Time Slots -----------------

@router.get("/slots")
def get_available_slots(
    centre_id: int,
    category_id: int,
    slot_date: date,
    db: Session = Depends(get_db)
):
    """
    Fetches configured or generated slots for a given date, calculating live remaining capacity.
    Standard business hours (09:00 - 17:00) with 30-min intervals if not pre-seeded.
    """
    centre = db.query(ServiceCentre).filter(ServiceCentre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Service Centre not found")

    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Service Category not found")

    # Check for existing slots in DB
    existing_slots = db.query(ServiceSlot).filter(
        ServiceSlot.centre_id == centre_id,
        ServiceSlot.category_id == category_id,
        ServiceSlot.slot_date == slot_date
    ).all()

    # If no slots exist for this date yet, dynamically create standard slots
    if not existing_slots:
        # Standard default intervals: 09:00 to 17:00
        default_times = [
            ("09:00", "09:30"), ("09:30", "10:00"),
            ("10:00", "10:30"), ("10:30", "11:00"),
            ("11:00", "11:30"), ("11:30", "12:00"),
            ("13:00", "13:30"), ("13:30", "14:00"),
            ("14:00", "14:30"), ("14:30", "15:00"),
            ("15:00", "15:30"), ("15:30", "16:00"),
            ("16:00", "16:30"), ("16:30", "17:00")
        ]
        created_slots = []
        for start_t, end_t in default_times:
            s = ServiceSlot(
                centre_id=centre_id,
                category_id=category_id,
                slot_date=slot_date,
                start_time=start_t,
                end_time=end_t,
                max_capacity=5,
                booked_count=0,
                is_available=True
            )
            db.add(s)
            created_slots.append(s)
        db.commit()
        for s in created_slots:
            db.refresh(s)
        existing_slots = created_slots

    result = []
    for slot in existing_slots:
        # Calculate active bookings for this slot
        active_bookings = db.query(Appointment).filter(
            Appointment.slot_id == slot.id,
            Appointment.status.in_(["booked", "confirmed"])
        ).count()

        available_spaces = max(0, slot.max_capacity - active_bookings)
        is_available = available_spaces > 0 and slot.is_available

        result.append({
            "id": slot.id,
            "centre_id": slot.centre_id,
            "category_id": slot.category_id,
            "slot_date": slot.slot_date,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "max_capacity": slot.max_capacity,
            "booked_count": active_bookings,
            "available_spaces": available_spaces,
            "is_available": is_available
        })

    return result
