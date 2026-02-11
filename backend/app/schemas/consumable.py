"""Consumable Schemas"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional


class ConsumableBase(BaseModel):
    """Base consumable schema"""
    name: str = Field(..., min_length=1, max_length=200)
    consumable_type: str = Field(..., min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=200)
    product_name: Optional[str] = Field(None, max_length=200)
    quantity_on_hand: Optional[float] = None
    quantity_unit: Optional[str] = Field(None, max_length=50)
    purchase_date: Optional[date] = None
    purchase_price: Optional[str] = Field(None, max_length=50)
    purchase_url: Optional[str] = Field(None, max_length=500)
    expiration_date: Optional[date] = None
    status: str = Field(default="active", description="active, low_stock, depleted, or expired")
    notes: Optional[str] = None


class ConsumableCreate(ConsumableBase):
    """Schema for creating consumables"""
    tank_id: UUID


class ConsumableUpdate(BaseModel):
    """Schema for updating consumables"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    consumable_type: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=200)
    product_name: Optional[str] = Field(None, max_length=200)
    quantity_on_hand: Optional[float] = None
    quantity_unit: Optional[str] = Field(None, max_length=50)
    purchase_date: Optional[date] = None
    purchase_price: Optional[str] = Field(None, max_length=50)
    purchase_url: Optional[str] = Field(None, max_length=500)
    expiration_date: Optional[date] = None
    status: Optional[str] = Field(None, description="active, low_stock, depleted, or expired")
    notes: Optional[str] = None


class ConsumableResponse(ConsumableBase):
    """Schema for consumable responses"""
    id: UUID
    tank_id: UUID
    user_id: UUID
    usage_count: int = 0
    total_used: float = 0
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConsumableUsageBase(BaseModel):
    """Base usage schema"""
    usage_date: date
    quantity_used: float = Field(..., gt=0)
    quantity_unit: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None


class ConsumableUsageCreate(ConsumableUsageBase):
    """Schema for logging usage"""
    pass


class ConsumableUsageResponse(ConsumableUsageBase):
    """Schema for usage responses"""
    id: UUID
    consumable_id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
