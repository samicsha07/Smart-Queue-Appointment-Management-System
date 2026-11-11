from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class QueueTokenOut(BaseModel):
    id: int
    token_number: str
    sequence_number: int
    appointment_id: Optional[int] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    centre_id: int
    centre_name: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    operating_date: date
    status: str
    called_at: Optional[datetime] = None
    served_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    appointment_time: Optional[str] = None

    class Config:
        from_attributes = True

class LiveQueueStatus(BaseModel):
    token_id: int
    token_number: str
    centre_id: int
    centre_name: str
    category_id: int
    category_name: str
    currently_serving_token: Optional[str] = None
    people_ahead: int = 0
    estimated_waiting_time_minutes: int = 0
    status: str # 'waiting', 'serving', 'completed', 'skipped', 'cancelled'
    appointment_date: date
    appointment_time: str

class QueueActionRequest(BaseModel):
    action: str # 'call_next', 'mark_serving', 'mark_completed', 'mark_skipped', 'mark_cancelled'
    token_id: Optional[int] = None
    centre_id: int
    category_id: Optional[int] = None
