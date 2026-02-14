"""
Tank API Endpoints

CRUD operations for user tanks.

Multi-tenancy: Users can only access their own tanks.
"""
import os
import secrets
import string
from typing import List
from uuid import UUID, uuid4
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank, TankEvent
from app.schemas.dashboard import MaturityScore
from app.schemas.tank import (
    TankCreate, TankUpdate, TankResponse,
    TankEventCreate, TankEventUpdate, TankEventResponse,
    ShareTokenResponse,
)
from app.api.deps import get_current_user
from app.api.v1.parameter_ranges import populate_default_ranges
from app.services.maturity import compute_maturity_batch

SHARE_TOKEN_CHARS = string.ascii_lowercase + string.digits
SHARE_TOKEN_LENGTH = 8


def _generate_share_token(db: Session) -> str:
    """Generate a unique 8-char share token."""
    for _ in range(10):
        token = "".join(secrets.choice(SHARE_TOKEN_CHARS) for _ in range(SHARE_TOKEN_LENGTH))
        if not db.query(Tank).filter(Tank.share_token == token).first():
            return token
    raise RuntimeError("Failed to generate unique share token")

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
    include_archived: bool = Query(False, description="Include archived tanks"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all tanks owned by the current user.

    Returns empty list if user has no tanks.
    """
    query = db.query(Tank).filter(Tank.user_id == current_user.id)
    if not include_archived:
        query = query.filter(Tank.is_archived == False)
    tanks = query.all()
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

    # Clear default if this was the default tank
    if current_user.default_tank_id == tank_id:
        current_user.default_tank_id = None

    db.delete(tank)
    db.commit()
    return None


@router.post("/{tank_id}/archive", response_model=TankResponse)
def archive_tank(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Archive a tank (hide from default list)."""
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == current_user.id).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")
    tank.is_archived = True
    db.commit()
    db.refresh(tank)
    return tank


@router.post("/{tank_id}/unarchive", response_model=TankResponse)
def unarchive_tank(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unarchive a tank (restore to default list)."""
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == current_user.id).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")
    tank.is_archived = False
    db.commit()
    db.refresh(tank)
    return tank


@router.post("/{tank_id}/set-default", response_model=TankResponse)
def set_default_tank(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set a tank as the user's default tank (pre-selected across all pages)."""
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == current_user.id).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")
    current_user.default_tank_id = tank.id
    db.commit()
    db.refresh(tank)
    return tank


@router.delete("/{tank_id}/set-default", status_code=status.HTTP_204_NO_CONTENT)
def unset_default_tank(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a tank as the user's default."""
    if current_user.default_tank_id == tank_id:
        current_user.default_tank_id = None
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


@router.get("/{tank_id}/maturity", response_model=MaturityScore)
def get_tank_maturity(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return maturity score for a single tank."""
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id,
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found",
        )

    try:
        results = compute_maturity_batch(
            db,
            str(current_user.id),
            [(tank.id, tank.setup_date, tank.water_type or "saltwater")],
        )
        ms = results.get(str(tank.id), {})
        return MaturityScore(**ms) if ms else MaturityScore()
    except Exception:
        return MaturityScore()


@router.get("/{tank_id}/report-card")
def get_tank_report_card(
    tank_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the health report card for a tank."""
    from app.services.report_card import compute_report_card
    result = compute_report_card(db, str(tank_id), str(current_user.id))
    if not result:
        raise HTTPException(status_code=404, detail="Tank not found")
    return result


@router.get("/{tank_id}/score-history")
def get_score_history(
    tank_id: str,
    days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get score evolution history for a tank."""
    from datetime import date, timedelta
    from app.models.score_history import ScoreHistory

    start_date = date.today() - timedelta(days=days)
    rows = (
        db.query(ScoreHistory)
        .filter(
            ScoreHistory.tank_id == tank_id,
            ScoreHistory.user_id == current_user.id,
            ScoreHistory.recorded_at >= start_date,
        )
        .order_by(ScoreHistory.recorded_at)
        .all()
    )

    return [
        {
            "recorded_at": row.recorded_at.isoformat(),
            "overall_score": row.overall_score,
            "overall_grade": row.overall_grade,
            "categories": {
                "parameter_stability": row.parameter_stability_score,
                "maintenance": row.maintenance_score,
                "livestock_health": row.livestock_health_score,
                "equipment": row.equipment_score,
                "maturity": row.maturity_score,
                "water_chemistry": row.water_chemistry_score,
            },
        }
        for row in rows
    ]


@router.post("/{tank_id}/score-history/backfill")
def backfill_tank_score_history(
    tank_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Backfill weekly historical score snapshots from setup_date to yesterday."""
    from app.services.report_card import backfill_score_history
    count = backfill_score_history(db, str(tank_id), str(current_user.id))
    return {"backfilled": count}


@router.get("/{tank_id}/report-card/pdf")
def get_tank_report_card_pdf(
    tank_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download the health report card as a PDF."""
    from app.services.report_card import compute_report_card
    from app.services.report_card_pdf import generate_report_card_pdf
    from fastapi.responses import Response

    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id,
    ).first()
    if not tank:
        raise HTTPException(status_code=404, detail="Tank not found")

    result = compute_report_card(db, str(tank_id), str(current_user.id))
    if not result:
        raise HTTPException(status_code=404, detail="Report card not available")

    # Gather extra data for a richer PDF
    from app.models.livestock import Livestock
    from app.models.lighting import LightingSchedule
    livestock_rows = db.query(Livestock).filter(
        Livestock.tank_id == tank_id, Livestock.status == "alive", Livestock.is_archived == False
    ).all()
    lighting_rows = db.query(LightingSchedule).filter(
        LightingSchedule.tank_id == tank_id
    ).all()

    tank_info = {
        "setup_date": str(tank.setup_date) if tank.setup_date else None,
        "display_volume_liters": tank.display_volume_liters,
        "sump_volume_liters": tank.sump_volume_liters,
        "total_volume_liters": tank.total_volume_liters,
        "image_url": tank.image_url,
        "has_refugium": tank.has_refugium or False,
        "refugium_type": tank.refugium_type,
        "refugium_volume_liters": tank.refugium_volume_liters,
        "refugium_algae": tank.refugium_algae,
        "refugium_lighting_hours": tank.refugium_lighting_hours,
        "livestock": [{"species": l.species_name, "common": l.common_name, "type": l.type, "qty": l.quantity} for l in livestock_rows],
        "lighting": [{"name": ls.name, "channels": len(ls.channels) if ls.channels else 0, "active": ls.is_active} for ls in lighting_rows],
    }

    pdf_bytes = generate_report_card_pdf(
        tank_name=tank.name,
        water_type=tank.water_type or "unknown",
        report_data=result,
        tank_info=tank_info,
    )

    filename = f"report-card-{tank.name.lower().replace(' ', '-')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============================================================================
# Tank Sharing Endpoints
# ============================================================================

@router.post("/{tank_id}/share", response_model=ShareTokenResponse)
def enable_sharing(
    tank_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Enable sharing for a tank. Generates a token if one doesn't exist."""
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == current_user.id).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")

    if not tank.share_token:
        tank.share_token = _generate_share_token(db)

    tank.share_enabled = True
    db.commit()
    db.refresh(tank)

    base_url = str(request.base_url).rstrip("/")
    share_url = f"{base_url}/share/tank/{tank.share_token}"

    return ShareTokenResponse(
        share_token=tank.share_token,
        share_enabled=True,
        share_url=share_url,
    )


@router.delete("/{tank_id}/share", status_code=status.HTTP_204_NO_CONTENT)
def disable_sharing(
    tank_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disable sharing (keeps token so re-enabling restores the same URL)."""
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == current_user.id).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")

    tank.share_enabled = False
    db.commit()
    return None


@router.post("/{tank_id}/share/regenerate", response_model=ShareTokenResponse)
def regenerate_share_token(
    tank_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a new share token (invalidates old links)."""
    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == current_user.id).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")

    tank.share_token = _generate_share_token(db)
    tank.share_enabled = True
    db.commit()
    db.refresh(tank)

    base_url = str(request.base_url).rstrip("/")
    share_url = f"{base_url}/share/tank/{tank.share_token}"

    return ShareTokenResponse(
        share_token=tank.share_token,
        share_enabled=True,
        share_url=share_url,
    )
