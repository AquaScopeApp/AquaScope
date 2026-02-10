"""
Parameter Range Schemas

Pydantic models for parameter range request/response validation.
"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class ParameterRangeBase(BaseModel):
    """Base schema for a parameter range"""
    parameter_type: str = Field(..., description="e.g. calcium, gh, ammonia")
    name: str = Field(..., description="Display name")
    unit: str = Field(..., description="Unit of measurement")
    min_value: float
    max_value: float
    ideal_value: Optional[float] = None


class ParameterRangeResponse(ParameterRangeBase):
    """Schema for parameter range responses"""
    id: UUID
    tank_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ParameterRangeBulkUpdate(BaseModel):
    """Schema for bulk updating parameter ranges for a tank"""
    ranges: List[ParameterRangeBase]
