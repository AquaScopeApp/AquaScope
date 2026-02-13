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
from sqlalchemy import Column, String, Text, Date, DateTime, ForeignKey, Integer, Boolean
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

    # External API integration (all nullable for backward compatibility)
    fishbase_species_id = Column(String, nullable=True, index=True)  # Links to FishBase API
    worms_id = Column(String, nullable=True, index=True)  # WoRMS AphiaID
    inaturalist_id = Column(String, nullable=True, index=True)  # iNaturalist taxon ID
    cached_photo_url = Column(String, nullable=True)  # Primary photo URL (cached)

    # Quantity (number of individuals of this species)
    quantity = Column(Integer, nullable=False, default=1)

    # Status tracking: alive, dead, removed
    status = Column(String, nullable=False, default="alive", index=True)

    # Tank history
    added_date = Column(Date, nullable=True)  # When added to tank
    removed_date = Column(Date, nullable=True)  # When removed/died
    notes = Column(Text, nullable=True)  # Observations, source, price, etc.
    purchase_price = Column(String, nullable=True)  # e.g., "$50", "€30"
    purchase_url = Column(String, nullable=True)  # URL where the item was purchased

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Archive
    is_archived = Column(Boolean, default=False, nullable=False, index=True)

    # Relationships
    tank = relationship("Tank", back_populates="livestock")
    owner = relationship("User", back_populates="livestock")
    disease_records = relationship("DiseaseRecord", back_populates="livestock", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Livestock {self.common_name or self.species_name} ({self.type})>"
