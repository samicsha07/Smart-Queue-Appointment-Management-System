from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ServiceSlot(Base):
    __tablename__ = "service_slots"

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("service_centres.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("service_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_date = Column(Date, nullable=False, index=True)
    start_time = Column(String(10), nullable=False) # e.g. "09:00"
    end_time = Column(String(10), nullable=False)   # e.g. "09:30"
    max_capacity = Column(Integer, default=5)
    booked_count = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("centre_id", "category_id", "slot_date", "start_time", name="uq_slot_time"),
    )

    centre = relationship("ServiceCentre", back_populates="slots")
    category = relationship("ServiceCategory", back_populates="slots")
    appointments = relationship("Appointment", back_populates="slot")
