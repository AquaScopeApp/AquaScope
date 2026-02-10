"""
Tank Schemas

Pydantic models for tank request/response validation.
"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional, List


class TankEventBase(BaseModel):
    """Base schema for tank events"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    event_date: date
    event_type: Optional[str] = None


class TankEventCreate(TankEventBase):
    """Schema for creating a tank event"""
    pass


class TankEventUpdate(BaseModel):
    """Schema for updating a tank event"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    event_date: Optional[date] = None
    event_type: Optional[str] = None


class TankEventResponse(TankEventBase):
    """Schema for tank event responses"""
    id: UUID
    tank_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TankBase(BaseModel):
    """Base tank schema with common fields"""
    name: str = Field(..., min_length=1, max_length=100)
    water_type: str = Field("saltwater", description="freshwater, saltwater, or brackish")
    aquarium_subtype: Optional[str] = Field(None, description="e.g. sps_dominant, amazonian, tanganyika")
    display_volume_liters: Optional[float] = Field(None, gt=0)
    sump_volume_liters: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    image_url: Optional[str] = None
    setup_date: Optional[date] = None


class TankCreate(TankBase):
    """Schema for creating a new tank"""
    pass


class TankUpdate(BaseModel):
    """Schema for updating a tank (all fields optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    water_type: Optional[str] = Field(None, description="freshwater, saltwater, or brackish")
    aquarium_subtype: Optional[str] = Field(None, description="e.g. sps_dominant, amazonian, tanganyika")
    display_volume_liters: Optional[float] = Field(None, gt=0)
    sump_volume_liters: Optional[float] = Field(None, gt=0)
    description: Optional[str] = None
    image_url: Optional[str] = None
    setup_date: Optional[date] = None


class TankResponse(TankBase):
    """Schema for tank responses"""
    id: UUID
    user_id: UUID
    total_volume_liters: float
    created_at: datetime
    updated_at: datetime
    events: List[TankEventResponse] = []

    class Config:
        from_attributes = True
