"""
Parameter Ranges API Endpoints

CRUD operations for per-tank parameter ranges.
Ranges define the min, max, and ideal values for each water parameter.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.models.parameter_range import ParameterRange
from app.schemas.parameter_range import ParameterRangeResponse, ParameterRangeBulkUpdate
from app.api.deps import get_current_user
from app.services.parameter_presets import get_default_ranges

router = APIRouter()


def _verify_tank_ownership(tank_id: UUID, current_user: User, db: Session) -> Tank:
    """Verify tank exists and belongs to current user."""
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id
    ).first()
    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )
    return tank


def populate_default_ranges(tank: Tank, db: Session) -> List[ParameterRange]:
    """Populate a tank with default parameter ranges based on its water_type and subtype."""
    defaults = get_default_ranges(tank.water_type, tank.aquarium_subtype)
    ranges = []
    for entry in defaults:
        pr = ParameterRange(
            tank_id=tank.id,
            parameter_type=entry["parameter_type"],
            name=entry["name"],
            unit=entry["unit"],
            min_value=entry["min_value"],
            max_value=entry["max_value"],
            ideal_value=entry["ideal_value"],
        )
        db.add(pr)
        ranges.append(pr)
    db.flush()
    return ranges


@router.get(
    "/{tank_id}/parameter-ranges",
    response_model=List[ParameterRangeResponse],
)
def get_parameter_ranges(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all parameter ranges for a tank."""
    _verify_tank_ownership(tank_id, current_user, db)

    ranges = db.query(ParameterRange).filter(
        ParameterRange.tank_id == tank_id
    ).all()

    return ranges


@router.put(
    "/{tank_id}/parameter-ranges",
    response_model=List[ParameterRangeResponse],
)
def update_parameter_ranges(
    tank_id: UUID,
    bulk: ParameterRangeBulkUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bulk upsert parameter ranges for a tank.

    Replaces all existing ranges with the provided ones.
    """
    _verify_tank_ownership(tank_id, current_user, db)

    # Delete existing ranges
    db.query(ParameterRange).filter(ParameterRange.tank_id == tank_id).delete()

    # Insert new ranges
    new_ranges = []
    for entry in bulk.ranges:
        pr = ParameterRange(
            tank_id=tank_id,
            parameter_type=entry.parameter_type,
            name=entry.name,
            unit=entry.unit,
            min_value=entry.min_value,
            max_value=entry.max_value,
            ideal_value=entry.ideal_value,
        )
        db.add(pr)
        new_ranges.append(pr)

    db.commit()
    for pr in new_ranges:
        db.refresh(pr)

    return new_ranges


@router.post(
    "/{tank_id}/parameter-ranges/reset-defaults",
    response_model=List[ParameterRangeResponse],
)
def reset_parameter_ranges(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Reset parameter ranges to defaults based on tank's water_type and subtype.
    """
    tank = _verify_tank_ownership(tank_id, current_user, db)

    # Delete existing ranges
    db.query(ParameterRange).filter(ParameterRange.tank_id == tank_id).delete()

    # Populate defaults
    ranges = populate_default_ranges(tank, db)
    db.commit()
    for pr in ranges:
        db.refresh(pr)

    return ranges
