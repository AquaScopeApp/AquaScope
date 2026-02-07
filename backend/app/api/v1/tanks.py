"""
Tank API Endpoints

CRUD operations for user tanks.

Multi-tenancy: Users can only access their own tanks.
"""
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank, TankEvent
from app.schemas.tank import (
    TankCreate, TankUpdate, TankResponse,
    TankEventCreate, TankEventUpdate, TankEventResponse
)
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/", response_model=TankResponse, status_code=status.HTTP_201_CREATED)
def create_tank(
    tank_in: TankCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new tank for the current user.

    Users can have multiple tanks (display tank, quarantine, frag tank, etc.)
    """
    tank = Tank(
        **tank_in.model_dump(),
        user_id=current_user.id
    )
    db.add(tank)
    db.commit()
    db.refresh(tank)
    return tank


@router.get("/", response_model=List[TankResponse])
def list_tanks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all tanks owned by the current user.

    Returns empty list if user has no tanks.
    """
    tanks = db.query(Tank).filter(Tank.user_id == current_user.id).all()
    return tanks


@router.get("/{tank_id}", response_model=TankResponse)
def get_tank(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific tank by ID.

    Security: Ensures tank belongs to current user.
    """
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


@router.put("/{tank_id}", response_model=TankResponse)
def update_tank(
    tank_id: UUID,
    tank_in: TankUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a tank's information.

    Only provided fields will be updated.
    """
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )

    # Update only provided fields
    update_data = tank_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tank, field, value)

    db.commit()
    db.refresh(tank)
    return tank


@router.delete("/{tank_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tank(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a tank.

    Warning: This will cascade delete all associated data:
    - Notes
    - Photos
    - Maintenance reminders
    - Livestock records
    - Parameter data remains in InfluxDB (manual cleanup if desired)
    """
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )

    db.delete(tank)
    db.commit()
    return None


# ============================================================================
# Tank Events Endpoints
# ============================================================================

@router.post("/{tank_id}/events", response_model=TankEventResponse, status_code=status.HTTP_201_CREATED)
def create_tank_event(
    tank_id: UUID,
    event_in: TankEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new event for a tank (milestone, rescape, upgrade, etc.)
    """
    # Verify tank ownership
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )

    event = TankEvent(
        **event_in.model_dump(),
        tank_id=tank_id,
        user_id=current_user.id
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{tank_id}/events", response_model=List[TankEventResponse])
def list_tank_events(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all events for a tank, ordered by date (most recent first)
    """
    # Verify tank ownership
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )

    events = db.query(TankEvent).filter(
        TankEvent.tank_id == tank_id
    ).order_by(TankEvent.event_date.desc()).all()

    return events


@router.put("/{tank_id}/events/{event_id}", response_model=TankEventResponse)
def update_tank_event(
    tank_id: UUID,
    event_id: UUID,
    event_in: TankEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a tank event
    """
    event = db.query(TankEvent).filter(
        TankEvent.id == event_id,
        TankEvent.tank_id == tank_id,
        TankEvent.user_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    update_data = event_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)
    return event


@router.delete("/{tank_id}/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tank_event(
    tank_id: UUID,
    event_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a tank event
    """
    event = db.query(TankEvent).filter(
        TankEvent.id == event_id,
        TankEvent.tank_id == tank_id,
        TankEvent.user_id == current_user.id
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )

    db.delete(event)
    db.commit()
    return None
