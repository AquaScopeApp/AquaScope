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
    electricity_cost_per_day: Optional[float] = Field(None, ge=0)
    has_refugium: bool = False
    refugium_volume_liters: Optional[float] = Field(None, gt=0)
    refugium_type: Optional[str] = None
    refugium_algae: Optional[str] = None
    refugium_lighting_hours: Optional[float] = Field(None, ge=0, le=24)
    refugium_notes: Optional[str] = None


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
    electricity_cost_per_day: Optional[float] = Field(None, ge=0)
    has_refugium: Optional[bool] = None
    refugium_volume_liters: Optional[float] = Field(None, gt=0)
    refugium_type: Optional[str] = None
    refugium_algae: Optional[str] = None
    refugium_lighting_hours: Optional[float] = Field(None, ge=0, le=24)
    refugium_notes: Optional[str] = None


class TankResponse(TankBase):
    """Schema for tank responses"""
    id: UUID
    user_id: UUID
    total_volume_liters: float
    is_archived: bool = False
    share_token: Optional[str] = None
    share_enabled: bool = False
    created_at: datetime
    updated_at: datetime
    events: List[TankEventResponse] = []

    class Config:
        from_attributes = True


# ============================================================================
# Share Schemas
# ============================================================================

class ShareTokenResponse(BaseModel):
    """Response when enabling/regenerating sharing"""
    share_token: str
    share_enabled: bool
    share_url: str


class PublicLivestockItem(BaseModel):
    """Public-facing livestock data (no user_id, no purchase info)"""
    species_name: str
    common_name: Optional[str] = None
    type: str
    quantity: int = 1
    cached_photo_url: Optional[str] = None
    added_date: Optional[date] = None


class PublicPhotoItem(BaseModel):
    """Public-facing photo data"""
    id: UUID
    description: Optional[str] = None
    taken_at: datetime


class PublicEventItem(BaseModel):
    """Public-facing event data"""
    title: str
    description: Optional[str] = None
    event_date: date
    event_type: Optional[str] = None


class PublicLightingItem(BaseModel):
    """Public-facing lighting schedule data"""
    name: str
    description: Optional[str] = None
    channels: list  # [{"name": "Royal blue", "color": "#0000FF"}, ...]
    schedule_data: dict  # {"10": [0,0,0], "11": [5,10,8], ...}
    is_active: bool = False


class PublicTankProfile(BaseModel):
    """Full public tank profile — single payload for the share page"""
    # Tank info
    name: str
    water_type: str
    aquarium_subtype: Optional[str] = None
    display_volume_liters: Optional[float] = None
    sump_volume_liters: Optional[float] = None
    total_volume_liters: float
    description: Optional[str] = None
    has_image: bool = False
    setup_date: Optional[date] = None

    # Refugium
    has_refugium: bool = False
    refugium_volume_liters: Optional[float] = None
    refugium_type: Optional[str] = None
    refugium_algae: Optional[str] = None
    refugium_lighting_hours: Optional[float] = None

    # Maturity
    maturity: Optional[dict] = None

    # Report Card
    report_card: Optional[dict] = None

    # Collections
    livestock: List[PublicLivestockItem] = []
    photos: List[PublicPhotoItem] = []
    events: List[PublicEventItem] = []
    lighting: List[PublicLightingItem] = []

    # Counts
    livestock_count: int = 0
    photo_count: int = 0
    event_count: int = 0
