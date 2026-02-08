"""
MaintenanceReminder Model

Tracks recurring maintenance tasks with automatic scheduling.

Design Decisions:
- Frequency in days: Simple and flexible for various maintenance schedules
- last_completed + frequency_days = next_due: Automatic calculation
- reminder_type enum: Standardized categories for filtering and analytics
- is_active flag: Soft disable without deletion (preserves history)

Common Maintenance Schedules:
- Water change: 7-14 days
- Pump cleaning: 30-90 days
- Skimmer cleaning: 7-30 days
- Filter media change: 30-60 days
- Glass cleaning: 3-7 days
- Test kits calibration: 90-180 days

Why automatic next_due calculation?
- When marking complete, backend calculates next due date
- Prevents manual date entry errors
- Allows for schedule adjustments (if completed early/late)
- Frontend can sort by urgency (overdue, due soon, upcoming)
"""
from sqlalchemy import Column, String, Text, Integer, Date, Boolean, DateTime, ForeignKey
from app.models.types import GUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class MaintenanceReminder(Base):
    __tablename__ = "maintenance_reminders"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    equipment_id = Column(GUID, ForeignKey("equipment.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Reminder type for categorization and filtering
    # Common types: water_change, pump_cleaning, skimmer_cleaning, filter_media,
    # glass_cleaning, dosing_refill, test_kit_calibration, equipment_check
    reminder_type = Column(String, nullable=False, index=True)

    # Scheduling
    frequency_days = Column(Integer, nullable=False)  # How often this task repeats
    last_completed = Column(Date, nullable=True)  # Last time this task was done
    next_due = Column(Date, nullable=False, index=True)  # Next scheduled date (indexed for queries)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tank = relationship("Tank", back_populates="maintenance_reminders")
    owner = relationship("User", back_populates="maintenance_reminders")
    equipment = relationship("Equipment", back_populates="maintenance_reminders")

    def __repr__(self):
        return f"<MaintenanceReminder {self.title} - Due: {self.next_due}>"
