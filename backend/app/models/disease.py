"""
Disease/Health Tracking Models

Tracks disease incidents and their treatment history for aquarium livestock.

DiseaseRecord: a disease incident linked to a specific livestock entry
  - disease_name, symptoms, diagnosis, severity, status
  - Linked to Livestock (and by extension, its Tank)
  - Status lifecycle: active -> monitoring -> resolved | chronic

DiseaseTreatment: individual treatment actions for a disease
  - treatment_type: medication, water_change, quarantine, dip, temperature, other
  - Optionally linked to a Consumable (medication type) for stock deduction
  - Records dosage, notes, and effectiveness
"""
from sqlalchemy import Column, String, Text, Date, DateTime, Float, ForeignKey
from app.models.types import GUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class DiseaseRecord(Base):
    __tablename__ = "disease_records"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    livestock_id = Column(GUID, ForeignKey("livestock.id", ondelete="CASCADE"), nullable=False, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Disease information
    disease_name = Column(String, nullable=False, index=True)
    symptoms = Column(Text, nullable=True)
    diagnosis = Column(Text, nullable=True)
    severity = Column(String, nullable=False, default="moderate", index=True)  # mild, moderate, severe, critical
    status = Column(String, nullable=False, default="active", index=True)  # active, monitoring, resolved, chronic

    # Dates
    detected_date = Column(Date, nullable=False)
    resolved_date = Column(Date, nullable=True)

    # Outcome
    outcome = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    livestock = relationship("Livestock", back_populates="disease_records")
    tank = relationship("Tank", back_populates="disease_records")
    owner = relationship("User", back_populates="disease_records")
    treatments = relationship("DiseaseTreatment", back_populates="disease_record", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<DiseaseRecord {self.disease_name} - {self.severity} ({self.status})>"


class DiseaseTreatment(Base):
    __tablename__ = "disease_treatments"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    disease_record_id = Column(GUID, ForeignKey("disease_records.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    consumable_id = Column(GUID, ForeignKey("consumables.id", ondelete="SET NULL"), nullable=True, index=True)

    # Treatment information
    treatment_type = Column(String, nullable=False, index=True)  # medication, water_change, quarantine, dip, temperature, other
    treatment_name = Column(String, nullable=False)
    dosage = Column(String, nullable=True)
    quantity_used = Column(Float, nullable=True)
    quantity_unit = Column(String, nullable=True)

    # Timing
    treatment_date = Column(Date, nullable=False)
    duration_days = Column(Float, nullable=True)

    # Effectiveness
    effectiveness = Column(String, nullable=True)  # effective, partially_effective, ineffective, too_early
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    disease_record = relationship("DiseaseRecord", back_populates="treatments")
    consumable = relationship("Consumable")
    owner = relationship("User")

    def __repr__(self):
        return f"<DiseaseTreatment {self.treatment_name} on {self.treatment_date}>"
