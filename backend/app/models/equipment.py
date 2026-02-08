"""
Equipment Model

Tracks aquarium equipment like pumps, lights, heaters, skimmers, etc.

Features:
- Manufacturer and model tracking
- Purchase date and condition monitoring
- Technical specifications storage
- Links to maintenance reminders
- Tank association

Why track equipment?
===================
- Schedule preventive maintenance
- Track equipment lifespan and replacement dates
- Monitor warranty periods
- Document specifications for replacements
- Cost tracking and budgeting
"""
from sqlalchemy import Column, String, Text, DateTime, Date, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Equipment(Base):
    __tablename__ = "equipment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(UUID(as_uuid=True), ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Basic information
    name = Column(String, nullable=False, index=True)  # e.g., "Return Pump", "Main Light"
    equipment_type = Column(String, nullable=False, index=True)  # pump, light, heater, skimmer, controller, etc.
    manufacturer = Column(String, nullable=True)  # e.g., "Ecotech", "Neptune Systems"
    model = Column(String, nullable=True)  # e.g., "Vectra M2", "Apex Classic"

    # Specifications (JSON for flexibility)
    specs = Column(JSON, nullable=True)  # {"power": "100W", "flow_rate": "1000 GPH", etc.}

    # Purchase and condition
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(String, nullable=True)  # Store as string to allow currency symbols
    condition = Column(String, nullable=True)  # new, used, refurbished, needs_maintenance, failing
    status = Column(String, nullable=False, default="active", index=True)  # active (in use) or stock (available)

    # Additional notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tank = relationship("Tank", back_populates="equipment")
    owner = relationship("User", back_populates="equipment")
    maintenance_reminders = relationship("MaintenanceReminder", back_populates="equipment")

    def __repr__(self):
        return f"<Equipment {self.name} - {self.manufacturer or 'Unknown'} {self.model or ''}>"
