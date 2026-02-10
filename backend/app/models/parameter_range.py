"""
ParameterRange Model

Stores customizable parameter ranges per tank. Each tank has its own set of
parameter ranges that define min, max, and ideal values. These are populated
with defaults based on the tank's water_type and aquarium_subtype when created,
and can be customized by the user.
"""
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint
from app.models.types import GUID
from datetime import datetime
import uuid

from app.database import Base


class ParameterRange(Base):
    __tablename__ = "parameter_ranges"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)

    parameter_type = Column(String, nullable=False)   # calcium, gh, ammonia, etc.
    name = Column(String, nullable=False)              # Display name
    unit = Column(String, nullable=False)              # ppm, dKH, SG, etc.
    min_value = Column(Float, nullable=False)
    max_value = Column(Float, nullable=False)
    ideal_value = Column(Float, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('tank_id', 'parameter_type', name='uq_tank_parameter_type'),
    )

    def __repr__(self):
        return f"<ParameterRange {self.parameter_type} for tank {self.tank_id}>"
