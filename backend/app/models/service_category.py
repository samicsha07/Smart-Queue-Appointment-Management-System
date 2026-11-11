from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("service_centres.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    avg_duration_minutes = Column(Integer, default=15)
    token_prefix = Column(String(5), default="A")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    centre = relationship("ServiceCentre", back_populates="categories")
    slots = relationship("ServiceSlot", back_populates="category", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="category", cascade="all, delete-orphan")
    tokens = relationship("QueueToken", back_populates="category", cascade="all, delete-orphan")
