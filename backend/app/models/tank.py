"""
Tank Model

Represents a reef aquarium. Users can have multiple tanks, each tracked separately.

Design Decisions:
- Separate tank entity: Allows users to manage multiple aquariums
- Volume in liters: Standardized metric unit (can be converted in UI)
- Separate display and sump volumes: Allows for precise system calculations
- Setup date: Important for tracking tank maturity and parameter stability
- Foreign key to User: Implements multi-tenancy and data isolation
- Description and image: Rich tank information and visual identification
- Events: Track major milestones and changes
- Water type and subtype: Support for freshwater, saltwater, and brackish aquariums
- Parameter ranges: Per-tank customizable parameter ranges

Why separate tanks from users?
- Hobbyists often maintain multiple tanks (display, quarantine, frag tanks)
- Parameters, livestock, and maintenance are tank-specific
- Allows for tank-specific analytics and comparisons
"""
from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Text
from app.models.types import GUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Tank(Base):
    __tablename__ = "tanks"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)

    # Volume fields (optional - not everyone measures precisely)
    display_volume_liters = Column(Float, nullable=True)
    sump_volume_liters = Column(Float, nullable=True)

    # Aquarium type
    water_type = Column(String, nullable=False, default="saltwater")  # freshwater, saltwater, brackish
    aquarium_subtype = Column(String, nullable=True)  # sps_dominant, amazonian, tanganyika, etc.

    # Rich information
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)  # URL or path to tank image

    setup_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="tanks")
    notes = relationship("Note", back_populates="tank", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="tank", cascade="all, delete-orphan")
    maintenance_reminders = relationship("MaintenanceReminder", back_populates="tank", cascade="all, delete-orphan")
    livestock = relationship("Livestock", back_populates="tank", cascade="all, delete-orphan")
    events = relationship("TankEvent", back_populates="tank", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="tank", cascade="all, delete-orphan")
    icp_tests = relationship("ICPTest", back_populates="tank", cascade="all, delete-orphan")
    parameter_ranges = relationship("ParameterRange", cascade="all, delete-orphan")

    @property
    def total_volume_liters(self) -> float:
        """Calculate total system volume"""
        total = 0.0
        if self.display_volume_liters:
            total += self.display_volume_liters
        if self.sump_volume_liters:
            total += self.sump_volume_liters
        return total

    def __repr__(self):
        return f"<Tank {self.name}>"


class TankEvent(Base):
    """Major events and milestones in tank history"""
    __tablename__ = "tank_events"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=False)
    event_type = Column(String, nullable=True)  # e.g., "setup", "rescape", "upgrade", "crash", "milestone"

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tank = relationship("Tank", back_populates="events")
    owner = relationship("User")

    def __repr__(self):
        return f"<TankEvent {self.title} on {self.event_date}>"
