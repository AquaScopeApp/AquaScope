"""Equipment Schemas"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional, Dict, Any


class EquipmentBase(BaseModel):
    """Base equipment schema"""
    name: str = Field(..., min_length=1, max_length=200)
    equipment_type: str = Field(..., min_length=1, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=200)
    model: Optional[str] = Field(None, max_length=200)
    specs: Optional[Dict[str, Any]] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[str] = Field(None, max_length=50)
    condition: Optional[str] = Field(None, max_length=100)
    status: str = Field(default="active", description="active (in use) or stock (available)")
    notes: Optional[str] = None


class EquipmentCreate(EquipmentBase):
    """Schema for creating equipment"""
    tank_id: UUID


class EquipmentUpdate(BaseModel):
    """Schema for updating equipment"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    equipment_type: Optional[str] = Field(None, min_length=1, max_length=100)
    manufacturer: Optional[str] = Field(None, max_length=200)
    model: Optional[str] = Field(None, max_length=200)
    specs: Optional[Dict[str, Any]] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[str] = Field(None, max_length=50)
    condition: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, description="active or stock")
    notes: Optional[str] = None


class EquipmentResponse(EquipmentBase):
    """Schema for equipment responses"""
    id: UUID
    tank_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
