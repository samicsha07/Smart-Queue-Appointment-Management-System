from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class ServiceCentre(Base):
    __tablename__ = "service_centres"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False) # 'Hospital', 'Clinic', 'Bank', 'Salon', 'Service Centre'
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    phone = Column(String(25), nullable=True)
    opening_time = Column(String(10), default="09:00")
    closing_time = Column(String(10), default="18:00")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    categories = relationship("ServiceCategory", back_populates="centre", cascade="all, delete-orphan")
    slots = relationship("ServiceSlot", back_populates="centre", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="centre", cascade="all, delete-orphan")
    tokens = relationship("QueueToken", back_populates="centre", cascade="all, delete-orphan")
