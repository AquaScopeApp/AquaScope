"""
Dashboard API Endpoint

Returns all data the dashboard needs in a single request,
replacing N*7 individual API calls with one efficient query.
"""
from typing import List
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.models.equipment import Equipment
from app.models.livestock import Livestock
from app.models.photo import Photo
from app.models.note import Note
from app.models.maintenance import MaintenanceReminder
from app.models.consumable import Consumable
from app.schemas.dashboard import DashboardResponse, TankSummary
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/summary", response_model=DashboardResponse)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return everything the dashboard needs in one call:
    - Per-tank counts (equipment, livestock, photos, notes, maintenance, consumables)
    - Overdue maintenance totals
    """
    tanks = (
        db.query(Tank)
        .filter(Tank.user_id == current_user.id, Tank.is_archived == False)
        .order_by(Tank.created_at)
        .all()
    )

    tank_ids = [t.id for t in tanks]

    # Batch-count every entity type with a single query each
    def _counts(model, id_col):
        rows = (
            db.query(id_col, func.count())
            .filter(id_col.in_(tank_ids))
            .group_by(id_col)
            .all()
        )
        return {tid: cnt for tid, cnt in rows}

    equipment_counts = _counts(Equipment, Equipment.tank_id)
    livestock_counts = _counts(Livestock, Livestock.tank_id)
    photo_counts = _counts(Photo, Photo.tank_id)
    note_counts = _counts(Note, Note.tank_id)
    maintenance_counts = _counts(MaintenanceReminder, MaintenanceReminder.tank_id)
    consumable_counts = _counts(Consumable, Consumable.tank_id)

    # Overdue per tank
    today = date.today()
    overdue_rows = (
        db.query(MaintenanceReminder.tank_id, func.count())
        .filter(
            MaintenanceReminder.tank_id.in_(tank_ids),
            MaintenanceReminder.is_active == True,
            MaintenanceReminder.next_due < today,
        )
        .group_by(MaintenanceReminder.tank_id)
        .all()
    )
    overdue_counts = {tid: cnt for tid, cnt in overdue_rows}

    summaries: List[TankSummary] = []
    total_overdue = 0

    for tank in tanks:
        overdue = overdue_counts.get(tank.id, 0)
        total_overdue += overdue
        summaries.append(
            TankSummary(
                tank_id=tank.id,
                tank_name=tank.name,
                water_type=tank.water_type,
                aquarium_subtype=tank.aquarium_subtype,
                total_volume_liters=tank.total_volume_liters or 0,
                setup_date=tank.setup_date.isoformat() if tank.setup_date else None,
                image_url=tank.image_url,
                is_default=tank.id == current_user.default_tank_id,
                equipment_count=equipment_counts.get(tank.id, 0),
                livestock_count=livestock_counts.get(tank.id, 0),
                photos_count=photo_counts.get(tank.id, 0),
                notes_count=note_counts.get(tank.id, 0),
                maintenance_count=maintenance_counts.get(tank.id, 0),
                consumables_count=consumable_counts.get(tank.id, 0),
                overdue_count=overdue,
            )
        )

    return DashboardResponse(tanks=summaries, total_overdue=total_overdue)
