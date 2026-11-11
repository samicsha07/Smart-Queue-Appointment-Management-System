from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from backend.app.schemas.service import ServiceCentreBase, ServiceCategoryBase

class AppointmentCreate(BaseModel):
    centre_id: int
    category_id: int
    appointment_date: date
    appointment_time: str
    slot_id: Optional[int] = None
    notes: Optional[str] = None

class QueueTokenBrief(BaseModel):
    id: int
    token_number: str
    sequence_number: int
    status: str
    operating_date: date

    class Config:
        from_attributes = True

class AppointmentOut(BaseModel):
    id: int
    user_id: int
    centre_id: int
    category_id: int
    slot_id: Optional[int] = None
    appointment_date: date
    appointment_time: str
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    
    centre_name: Optional[str] = None
    category_name: Optional[str] = None
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    token: Optional[QueueTokenBrief] = None

    class Config:
        from_attributes = True
