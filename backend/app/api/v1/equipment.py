"""
Equipment API Endpoints

CRUD operations for aquarium equipment.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.equipment import Equipment
from app.models.tank import Tank
from app.schemas.equipment import EquipmentCreate, EquipmentUpdate, EquipmentResponse
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
    status: str = Query(None, description="Filter by status (active or stock)"),
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

    if status:
        query = query.filter(Equipment.status == status)

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
    """Update equipment"""
    equipment = db.query(Equipment).filter(
        Equipment.id == equipment_id,
        Equipment.user_id == current_user.id
    ).first()

    if not equipment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found"
        )

    # Update fields
    update_data = equipment_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(equipment, field, value)

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
