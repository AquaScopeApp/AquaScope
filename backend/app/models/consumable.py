"""
Consumable Model

Tracks aquarium consumables like salt mix, additives, food, filter media, test kits, etc.

Features:
- Product tracking with brand info
- Quantity and stock level monitoring
- Expiration date tracking
- Purchase URL for reordering
- Usage history via ConsumableUsage records
"""
from sqlalchemy import Column, String, Text, DateTime, Date, ForeignKey, Float, Boolean
from app.models.types import GUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Consumable(Base):
    __tablename__ = "consumables"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Basic information
    name = Column(String, nullable=False, index=True)
    consumable_type = Column(String, nullable=False, index=True)  # salt_mix, additive, supplement, food, filter_media, test_kit, medication, other
    brand = Column(String, nullable=True)
    product_name = Column(String, nullable=True)

    # Quantity tracking
    quantity_on_hand = Column(Float, nullable=True)
    quantity_unit = Column(String, nullable=True)  # ml, L, g, kg, pieces, drops, tablets

    # Purchase info
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(String, nullable=True)
    purchase_url = Column(String, nullable=True)

    # Expiration
    expiration_date = Column(Date, nullable=True)

    # Status
    status = Column(String, nullable=False, default="active", index=True)  # active, low_stock, depleted, expired

    # Notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Archive
    is_archived = Column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    tank = relationship("Tank", back_populates="consumables")
    owner = relationship("User", back_populates="consumables")
    usage_records = relationship("ConsumableUsage", back_populates="consumable", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Consumable {self.name} - {self.brand or 'Unknown'}>"


class ConsumableUsage(Base):
    """Tracks individual usage/dosing events for a consumable"""
    __tablename__ = "consumable_usage"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    consumable_id = Column(GUID, ForeignKey("consumables.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    usage_date = Column(Date, nullable=False)
    quantity_used = Column(Float, nullable=False)
    quantity_unit = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    consumable = relationship("Consumable", back_populates="usage_records")
    owner = relationship("User")

    def __repr__(self):
        return f"<ConsumableUsage {self.quantity_used} on {self.usage_date}>"
