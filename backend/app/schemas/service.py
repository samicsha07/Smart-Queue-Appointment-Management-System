from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class ServiceCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    avg_duration_minutes: int = 15
    token_prefix: str = "A"
    is_active: bool = True

class ServiceCategoryCreate(ServiceCategoryBase):
    centre_id: int

class ServiceCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avg_duration_minutes: Optional[int] = None
    token_prefix: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceCategoryOut(ServiceCategoryBase):
    id: int
    centre_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ServiceCentreBase(BaseModel):
    name: str
    type: str # 'Hospital', 'Clinic', 'Bank', 'Salon', 'Service Centre'
    address: str
    city: str
    phone: Optional[str] = None
    opening_time: str = "09:00"
    closing_time: str = "18:00"
    is_active: bool = True

class ServiceCentreCreate(ServiceCentreBase):
    pass

class ServiceCentreUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    is_active: Optional[bool] = None

class ServiceCentreOut(ServiceCentreBase):
    id: int
    created_at: Optional[datetime] = None
    categories: List[ServiceCategoryOut] = []

    class Config:
        from_attributes = True

class ServiceSlotBase(BaseModel):
    centre_id: int
    category_id: int
    slot_date: date
    start_time: str
    end_time: str
    max_capacity: int = 5
    is_available: bool = True

class ServiceSlotCreate(ServiceSlotBase):
    pass

class ServiceSlotOut(ServiceSlotBase):
    id: int
    booked_count: int = 0
    available_spaces: int = 5

    class Config:
        from_attributes = True
