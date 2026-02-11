"""
Equipment API Endpoints

CRUD operations for aquarium equipment.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.equipment import Equipment
from app.models.consumable import Consumable
from app.models.tank import Tank
from app.models.maintenance import MaintenanceReminder
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, EquipmentResponse
from app.schemas.consumable import ConsumableResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def create_equipment(
    equipment: EquipmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create new equipment.

    - Validates tank ownership
    - Links to user and tank
    """
    # Verify tank belongs to user
    tank = db.query(Tank).filter(
        Tank.id == equipment.tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )

    # Create equipment
    db_equipment = Equipment(
        **equipment.model_dump(),
        user_id=current_user.id
    )

    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)

    return db_equipment


@router.get("/", response_model=List[EquipmentResponse])
def list_equipment(
    tank_id: UUID = Query(None, description="Filter by tank ID"),
    equipment_type: str = Query(None, description="Filter by equipment type"),
    status_filter: str = Query(None, alias="status", description="Filter by status (active or stock)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List equipment.

    - Optional filtering by tank, equipment type, or status
    - Returns user's equipment only
    """
    query = db.query(Equipment).filter(Equipment.user_id == current_user.id)

    if tank_id:
        # Verify tank belongs to user
        tank = db.query(Tank).filter(
            Tank.id == tank_id,
            Tank.user_id == current_user.id
        ).first()
        if not tank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tank not found"
            )
        query = query.filter(Equipment.tank_id == tank_id)

    if equipment_type:
        query = query.filter(Equipment.equipment_type == equipment_type)

    if status_filter:
        query = query.filter(Equipment.status == status_filter)

    equipment_list = query.order_by(Equipment.name).all()
    return equipment_list


@router.get("/{equipment_id}", response_model=EquipmentResponse)
def get_equipment(
    equipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get equipment by ID"""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()

    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found"
        )

    return equipment


@router.put("/{equipment_id}", response_model=EquipmentResponse)
def update_equipment(
    equipment_id: UUID,
    equipment_update: EquipmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update equipment. Auto-creates maintenance reminder when condition is needs_maintenance or failing."""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()

    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found"
        )

    old_condition = equipment.condition

    # Update fields
    update_data = equipment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(equipment, field, value)

    new_condition = equipment.condition
    needs_attention = new_condition in ("needs_maintenance", "failing")

    # Ensure a maintenance reminder exists whenever condition is bad
    if needs_attention:
        existing = db.query(MaintenanceReminder).filter(
            MaintenanceReminder.equipment_id == equipment_id,
            MaintenanceReminder.is_active == True,
        ).first()

        if not existing:
            label = "Repair" if new_condition == "failing" else "Maintenance"
            reminder = MaintenanceReminder(
                tank_id=equipment.tank_id,
                user_id=current_user.id,
                equipment_id=equipment.id,
                title=f"{label}: {equipment.name}",
                description=f"Equipment condition: {new_condition.replace('_', ' ')}. Inspect and service.",
                reminder_type="equipment_maintenance",
                frequency_days=7,
                next_due=date.today(),
                is_active=True,
            )
            db.add(reminder)

    # Deactivate auto-created reminder when condition improves
    elif old_condition in ("needs_maintenance", "failing"):
        db.query(MaintenanceReminder).filter(
            MaintenanceReminder.equipment_id == equipment_id,
            MaintenanceReminder.reminder_type == "equipment_maintenance",
            MaintenanceReminder.is_active == True,
        ).update({"is_active": False})

    db.commit()
    db.refresh(equipment)

    return equipment


@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_equipment(
    equipment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete equipment"""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()

    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found"
        )

    db.delete(equipment)
    db.commit()

    return None


# ============================================================================
# Conversion Endpoints
# ============================================================================


@router.post("/{equipment_id}/convert-to-consumable", response_model=ConsumableResponse)
def convert_to_consumable(
    equipment_id: UUID,
    consumable_type: str = Query("other", description="The consumable type to assign"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convert equipment to a consumable. Creates consumable and deletes the equipment."""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()

    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found"
        )

    new_consumable = Consumable(
        tank_id=equipment.tank_id,
        user_id=current_user.id,
        name=equipment.name,
        consumable_type=consumable_type,
        brand=equipment.manufacturer,
        product_name=equipment.model,
        purchase_date=equipment.purchase_date,
        purchase_price=equipment.purchase_price,
        status='active',
        notes=equipment.notes,
    )

    db.add(new_consumable)
    db.delete(equipment)
    db.commit()
    db.refresh(new_consumable)

    new_consumable.usage_count = 0
    return new_consumable
