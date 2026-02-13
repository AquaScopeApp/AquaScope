"""Disease/Health Tracking Schemas"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List


# ============================================================================
# Disease Record Schemas
# ============================================================================

class DiseaseRecordBase(BaseModel):
    """Base disease record schema"""
    disease_name: str = Field(..., min_length=1, max_length=200)
    symptoms: Optional[str] = Field(None, max_length=2000)
    diagnosis: Optional[str] = Field(None, max_length=2000)
    severity: str = Field("moderate", description="mild, moderate, severe, critical")
    notes: Optional[str] = Field(None, max_length=2000)


class DiseaseRecordCreate(DiseaseRecordBase):
    """Schema for creating a disease record"""
    livestock_id: UUID
    tank_id: UUID
    status: str = Field("active", description="active, monitoring, resolved, chronic")
    detected_date: date
    resolved_date: Optional[date] = None
    outcome: Optional[str] = Field(None, max_length=1000)


class DiseaseRecordUpdate(BaseModel):
    """Schema for updating a disease record"""
    disease_name: Optional[str] = Field(None, min_length=1, max_length=200)
    symptoms: Optional[str] = Field(None, max_length=2000)
    diagnosis: Optional[str] = Field(None, max_length=2000)
    severity: Optional[str] = Field(None, description="mild, moderate, severe, critical")
    status: Optional[str] = Field(None, description="active, monitoring, resolved, chronic")
    detected_date: Optional[date] = None
    resolved_date: Optional[date] = None
    outcome: Optional[str] = Field(None, max_length=1000)
    notes: Optional[str] = Field(None, max_length=2000)


# ============================================================================
# Disease Treatment Schemas
# ============================================================================

class DiseaseTreatmentBase(BaseModel):
    """Base treatment schema"""
    treatment_type: str = Field(..., description="medication, water_change, quarantine, dip, temperature, other")
    treatment_name: str = Field(..., min_length=1, max_length=200)
    dosage: Optional[str] = Field(None, max_length=200)
    quantity_used: Optional[float] = None
    quantity_unit: Optional[str] = Field(None, max_length=50)
    treatment_date: date
    duration_days: Optional[float] = None
    effectiveness: Optional[str] = Field(None, description="effective, partially_effective, ineffective, too_early")
    notes: Optional[str] = Field(None, max_length=2000)


class DiseaseTreatmentCreate(DiseaseTreatmentBase):
    """Schema for adding a treatment to a disease record"""
    consumable_id: Optional[UUID] = None


class DiseaseTreatmentResponse(DiseaseTreatmentBase):
    """Schema for treatment responses"""
    id: UUID
    disease_record_id: UUID
    user_id: UUID
    consumable_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Disease Record Response Schemas
# ============================================================================

class DiseaseRecordResponse(DiseaseRecordBase):
    """Schema for disease record responses"""
    id: UUID
    livestock_id: UUID
    tank_id: UUID
    user_id: UUID
    status: str
    detected_date: date
    resolved_date: Optional[date]
    outcome: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DiseaseRecordDetailResponse(DiseaseRecordResponse):
    """Full disease record with embedded treatments"""
    treatments: List[DiseaseTreatmentResponse] = []

    class Config:
        from_attributes = True


# ============================================================================
# Summary Schema
# ============================================================================

class DiseaseHealthSummary(BaseModel):
    """Aggregated health summary for a tank"""
    tank_id: UUID
    active_count: int
    monitoring_count: int
    chronic_count: int
    resolved_count: int
    total_treatments: int
    recent_diseases: List[DiseaseRecordResponse]
