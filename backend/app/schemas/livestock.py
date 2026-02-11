"""Livestock Schemas"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional


class LivestockBase(BaseModel):
    """Base livestock schema"""
    species_name: str = Field(..., min_length=1, max_length=200)
    common_name: Optional[str] = Field(None, max_length=200)
    type: str = Field(..., description="fish, coral, invertebrate")
    notes: Optional[str] = Field(None, max_length=2000)


class LivestockCreate(LivestockBase):
    """Schema for adding livestock"""
    tank_id: UUID
    fishbase_species_id: Optional[str] = None
    worms_id: Optional[str] = None  # WoRMS AphiaID
    inaturalist_id: Optional[str] = None  # iNaturalist taxon ID
    cached_photo_url: Optional[str] = None  # Primary photo URL
    quantity: int = Field(1, ge=1, description="Number of individuals")
    status: str = Field("alive", description="alive, dead, removed")
    added_date: Optional[date] = None


class LivestockUpdate(BaseModel):
    """Schema for updating livestock"""
    species_name: Optional[str] = Field(None, min_length=1, max_length=200)
    common_name: Optional[str] = Field(None, max_length=200)
    type: Optional[str] = None
    fishbase_species_id: Optional[str] = None
    worms_id: Optional[str] = None  # WoRMS AphiaID
    inaturalist_id: Optional[str] = None  # iNaturalist taxon ID
    cached_photo_url: Optional[str] = None  # Primary photo URL
    quantity: Optional[int] = Field(None, ge=1, description="Number of individuals")
    status: Optional[str] = Field(None, description="alive, dead, removed")
    added_date: Optional[date] = None
    removed_date: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=2000)


class LivestockResponse(LivestockBase):
    """Schema for livestock responses"""
    id: UUID
    tank_id: UUID
    user_id: UUID
    fishbase_species_id: Optional[str]
    worms_id: Optional[str]  # WoRMS AphiaID
    inaturalist_id: Optional[str]  # iNaturalist taxon ID
    cached_photo_url: Optional[str]  # Primary photo URL
    quantity: int
    status: str
    added_date: Optional[date]
    removed_date: Optional[date]
    is_archived: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class LivestockSplitRequest(BaseModel):
    """Schema for splitting a livestock entry (e.g., 3 alive -> 2 alive + 1 dead)"""
    split_quantity: int = Field(..., ge=1, description="Number of individuals to split off")
    new_status: str = Field(..., description="Status for the split-off group: dead or removed")


class LivestockSplitResponse(BaseModel):
    """Schema for the split result: returns both the updated original and the new entry"""
    original: LivestockResponse
    split: LivestockResponse

    class Config:
        from_attributes = True
