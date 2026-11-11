from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class NotificationOut(BaseModel):
    id: int
    user_id: int
    appointment_id: Optional[int] = None
    token_id: Optional[int] = None
    title: str
    message: str
    type: str # 'booking', 'token', 'approaching', 'serving', 'cancellation'
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class NotificationCount(BaseModel):
    unread_count: int
