"""Dashboard summary schemas."""
from typing import List, Optional, Dict
from uuid import UUID
from pydantic import BaseModel


class TankSummary(BaseModel):
    """Summary statistics for a single tank."""
    tank_id: UUID
    tank_name: str
    water_type: Optional[str] = None
    aquarium_subtype: Optional[str] = None
    total_volume_liters: float
    setup_date: Optional[str] = None
    image_url: Optional[str] = None
    is_default: bool = False

    # Counts
    equipment_count: int
    livestock_count: int
    photos_count: int
    notes_count: int
    maintenance_count: int
    consumables_count: int

    # Maintenance urgency
    overdue_count: int


class DashboardResponse(BaseModel):
    """Full dashboard payload — one request replaces N*7 calls."""
    tanks: List[TankSummary]
    total_overdue: int
