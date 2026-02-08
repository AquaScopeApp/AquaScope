"""
Livestock Model

Catalogs fish, corals, and invertebrates in the aquarium.

Design Decisions:
- Scientific and common names: FishBase provides both
- Type categorization: Fish, coral, invertebrate for filtering
- FishBase integration: Optional species_id for linking to external data
- Added date: Track tank stocking timeline
- Notes field: Flexible for behavior, growth, or health observations

FishBase Integration:
- FishBase (fishbase.org) is the world's largest database of fish species
- species_id links to FishBase for detailed species information
- Provides: habitat, diet, compatibility, max size, etc.
- For corals: May need alternative API (CoralTraits, AIMS)

Why track livestock?
- Monitor bioload and stocking levels
- Track compatibility and aggression
- Plan future additions based on tank capacity
- Historical record if livestock is lost
- Aid in troubleshooting (new addition causing issues)
"""
from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey
from app.models.types import GUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Livestock(Base):
    __tablename__ = "livestock"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Species information
    species_name = Column(String, nullable=False)  # Scientific name (e.g., "Amphiprion ocellaris")
    common_name = Column(String, nullable=True)  # Common name (e.g., "Clownfish")
    type = Column(String, nullable=False, index=True)  # fish, coral, invertebrate

    # External API integration
    fishbase_species_id = Column(String, nullable=True)  # Links to FishBase API

    # Tank history
    added_date = Column(Date, nullable=True)  # When added to tank
    notes = Column(Text, nullable=True)  # Observations, source, price, etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tank = relationship("Tank", back_populates="livestock")
    owner = relationship("User", back_populates="livestock")

    def __repr__(self):
        return f"<Livestock {self.common_name or self.species_name} ({self.type})>"
