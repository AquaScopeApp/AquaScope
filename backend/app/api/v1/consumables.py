"""
Consumables API Endpoints

CRUD operations for aquarium consumables plus usage tracking.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.consumable import Consumable, ConsumableUsage
from app.models.equipment import Equipment
from app.models.tank import Tank
from app.schemas.consumable import (
    ConsumableCreate, ConsumableUpdate, ConsumableResponse,
    ConsumableUsageCreate, ConsumableUsageResponse,
)
from app.schemas.equipment import EquipmentResponse
from app.api.deps import get_current_user

# Mapping from consumable_type to equipment_type
CONSUMABLE_TO_EQUIPMENT_TYPE = {
    'salt_mix': 'other',
    'additive': 'other',
    'supplement': 'other',
    'food': 'other',
    'filter_media': 'filter',
    'test_kit': 'other',
    'medication': 'other',
    'other': 'other',
    'gear': 'other',
    'decoration': 'other',
}

router = APIRouter()


@router.post("/", response_model=ConsumableResponse, status_code=status.HTTP_201_CREATED)
def create_consumable(
    consumable: ConsumableCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new consumable."""
    # Verify tank belongs to user
    tank = db.query(Tank).filter(
        Tank.id == consumable.tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )

    db_consumable = Consumable(
        **consumable.model_dump(),
        user_id=current_user.id
    )

    db.add(db_consumable)
    db.commit()
    db.refresh(db_consumable)

    # Add usage_count
    db_consumable.usage_count = 0
    return db_consumable


@router.get("/", response_model=List[ConsumableResponse])
def list_consumables(
    tank_id: UUID = Query(None, description="Filter by tank ID"),
    consumable_type: str = Query(None, description="Filter by consumable type"),
    status_filter: str = Query(None, alias="status", description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List consumables with optional filters."""
    query = db.query(Consumable).filter(Consumable.user_id == current_user.id)

    if tank_id:
        tank = db.query(Tank).filter(
            Tank.id == tank_id,
            Tank.user_id == current_user.id
        ).first()
        if not tank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tank not found"
            )
        query = query.filter(Consumable.tank_id == tank_id)

    if consumable_type:
        query = query.filter(Consumable.consumable_type == consumable_type)

    if status_filter:
        query = query.filter(Consumable.status == status_filter)

    consumables_list = query.order_by(Consumable.name).all()

    # Add usage_count for each consumable
    for c in consumables_list:
        c.usage_count = len(c.usage_records)

    return consumables_list


@router.get("/{consumable_id}", response_model=ConsumableResponse)
def get_consumable(
    consumable_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get consumable by ID."""
    consumable = db.query(Consumable).filter(
        Consumable.id == consumable_id,
        Consumable.user_id == current_user.id
    ).first()

    if not consumable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumable not found"
        )

    consumable.usage_count = len(consumable.usage_records)
    return consumable


@router.put("/{consumable_id}", response_model=ConsumableResponse)
def update_consumable(
    consumable_id: UUID,
    consumable_update: ConsumableUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update consumable."""
    consumable = db.query(Consumable).filter(
        Consumable.id == consumable_id,
        Consumable.user_id == current_user.id
    ).first()

    if not consumable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumable not found"
        )

    update_data = consumable_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(consumable, field, value)

    db.commit()
    db.refresh(consumable)

    consumable.usage_count = len(consumable.usage_records)
    return consumable


@router.delete("/{consumable_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_consumable(
    consumable_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete consumable."""
    consumable = db.query(Consumable).filter(
        Consumable.id == consumable_id,
        Consumable.user_id == current_user.id
    ).first()

    if not consumable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumable not found"
        )

    db.delete(consumable)
    db.commit()

    return None


# ============================================================================
# Usage Tracking Endpoints
# ============================================================================


@router.post("/{consumable_id}/usage", response_model=ConsumableUsageResponse, status_code=status.HTTP_201_CREATED)
def log_usage(
    consumable_id: UUID,
    usage: ConsumableUsageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log consumable usage and deduct from quantity on hand."""
    consumable = db.query(Consumable).filter(
        Consumable.id == consumable_id,
        Consumable.user_id == current_user.id
    ).first()

    if not consumable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumable not found"
        )

    # Create usage record
    db_usage = ConsumableUsage(
        consumable_id=consumable_id,
        user_id=current_user.id,
        **usage.model_dump()
    )
    db.add(db_usage)

    # Deduct from quantity on hand if tracked
    if consumable.quantity_on_hand is not None:
        consumable.quantity_on_hand = max(0, consumable.quantity_on_hand - usage.quantity_used)

        # Auto-update status based on remaining quantity
        if consumable.quantity_on_hand <= 0:
            consumable.status = "depleted"
        elif consumable.quantity_on_hand < (usage.quantity_used * 3):
            # Less than 3 doses left → low stock
            consumable.status = "low_stock"

    db.commit()
    db.refresh(db_usage)

    return db_usage


@router.get("/{consumable_id}/usage", response_model=List[ConsumableUsageResponse])
def list_usage(
    consumable_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List usage history for a consumable."""
    consumable = db.query(Consumable).filter(
        Consumable.id == consumable_id,
        Consumable.user_id == current_user.id
    ).first()

    if not consumable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumable not found"
        )

    usage_list = db.query(ConsumableUsage).filter(
        ConsumableUsage.consumable_id == consumable_id
    ).order_by(ConsumableUsage.usage_date.desc()).all()

    return usage_list


# ============================================================================
# Conversion Endpoints
# ============================================================================


@router.post("/{consumable_id}/convert-to-equipment", response_model=EquipmentResponse)
def convert_to_equipment(
    consumable_id: UUID,
    equipment_type: str = Query(None, description="Override the equipment type"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convert a consumable to equipment. Creates equipment and deletes the consumable."""
    consumable = db.query(Consumable).filter(
        Consumable.id == consumable_id,
        Consumable.user_id == current_user.id
    ).first()

    if not consumable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consumable not found"
        )

    eq_type = equipment_type or CONSUMABLE_TO_EQUIPMENT_TYPE.get(
        consumable.consumable_type, 'other'
    )

    new_equipment = Equipment(
        tank_id=consumable.tank_id,
        user_id=current_user.id,
        name=consumable.name,
        equipment_type=eq_type,
        manufacturer=consumable.brand,
        model=consumable.product_name,
        purchase_date=consumable.purchase_date,
        purchase_price=consumable.purchase_price,
        status=consumable.status if consumable.status in ('active', 'stock') else 'active',
        notes=consumable.notes,
    )

    db.add(new_equipment)
    db.delete(consumable)
    db.commit()
    db.refresh(new_equipment)

    return new_equipment
