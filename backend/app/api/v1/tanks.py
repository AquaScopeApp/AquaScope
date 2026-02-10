"""
Tank API Endpoints

CRUD operations for user tanks.

Multi-tenancy: Users can only access their own tanks.
"""
import os
from typing import List
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank, TankEvent
from app.schemas.tank import (
    TankCreate, TankUpdate, TankResponse,
    TankEventCreate, TankEventUpdate, TankEventResponse
)
from app.api.deps import get_current_user
from app.api.v1.parameter_ranges import populate_default_ranges

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
    db.flush()  # Get tank.id before populating ranges

    # Auto-populate default parameter ranges
    populate_default_ranges(tank, db)

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


@router.post("/{tank_id}/upload-image", response_model=TankResponse)
async def upload_tank_image(
    tank_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a tank image.

    Process:
    1. Validate file type (images only)
    2. Verify tank ownership
    3. Save file to disk with unique name
    4. Update tank's image_url field
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

    # Validate file type
    allowed_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )

    # Read and validate file size (max 10MB)
    content = await file.read()
    max_size = 10 * 1024 * 1024  # 10MB
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit"
        )

    # Create uploads directory if it doesn't exist
    upload_dir = Path("/app/uploads/tank-images")
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    unique_filename = f"{uuid4()}{file_ext}"
    file_path = upload_dir / unique_filename

    # Save file to disk
    with open(file_path, "wb") as f:
        f.write(content)

    # Update tank's image_url
    # Store as relative path that can be served by the backend
    tank.image_url = f"/uploads/tank-images/{unique_filename}"

    db.commit()
    db.refresh(tank)

    return tank


@router.get("/{tank_id}/image")
def get_tank_image(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Serve the tank image file"""
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found"
        )

    if not tank.image_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank has no image"
        )

    # Convert relative path to absolute path
    file_path = Path(f"/app{tank.image_url}")

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found"
        )

    return FileResponse(
        path=str(file_path),
        media_type="image/jpeg",  # Will be auto-detected by FastAPI
        filename=file_path.name
    )
