from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.app.database import Base

class QueueToken(Base):
    __tablename__ = "queue_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_number = Column(String(20), nullable=False) # e.g. A001, A002
    sequence_number = Column(Integer, nullable=False) # 1, 2, 3...
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="SET NULL"), unique=True, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    centre_id = Column(Integer, ForeignKey("service_centres.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("service_categories.id", ondelete="CASCADE"), nullable=False, index=True)
    operating_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), default="waiting", index=True) # 'waiting', 'serving', 'completed', 'skipped', 'cancelled'
    called_at = Column(DateTime(timezone=True), nullable=True)
    served_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("centre_id", "operating_date", "token_number", name="uq_centre_date_token"),
    )

    appointment = relationship("Appointment", back_populates="token")
    user = relationship("User", back_populates="tokens")
    centre = relationship("ServiceCentre", back_populates="tokens")
    category = relationship("ServiceCategory", back_populates="tokens")
    notifications = relationship("Notification", back_populates="token")
