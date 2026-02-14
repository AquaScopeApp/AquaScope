"""
Share API — Public endpoints for shared tank profiles.

No authentication required. Token-based access only.
"""
import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tank import Tank, TankEvent
from app.models.livestock import Livestock
from app.models.photo import Photo
from app.schemas.tank import (
    PublicTankProfile,
    PublicLivestockItem,
    PublicPhotoItem,
    PublicEventItem,
    PublicLightingItem,
)
from app.models.lighting import LightingSchedule
from app.services.maturity import compute_maturity_batch
from app.services.report_card import compute_report_card

router = APIRouter()


def _get_shared_tank(token: str, db: Session) -> Tank:
    """Look up a tank by share token. Raises 404 if not found or not enabled."""
    tank = db.query(Tank).filter(
        Tank.share_token == token,
        Tank.share_enabled == True,
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared tank not found",
        )
    return tank


@router.get("/{token}", response_model=PublicTankProfile)
def get_public_profile(token: str, db: Session = Depends(get_db)):
    """
    Public tank profile — returns all shareable data in one call.
    No authentication required.
    """
    tank = _get_shared_tank(token, db)

    # Livestock (alive only, no archived)
    livestock_rows = (
        db.query(Livestock)
        .filter(
            Livestock.tank_id == tank.id,
            Livestock.status == "alive",
            Livestock.is_archived == False,
        )
        .all()
    )

    # Photos (most recent first)
    photo_rows = (
        db.query(Photo)
        .filter(Photo.tank_id == tank.id)
        .order_by(Photo.taken_at.desc())
        .all()
    )

    # Events (most recent first)
    event_rows = (
        db.query(TankEvent)
        .filter(TankEvent.tank_id == tank.id)
        .order_by(TankEvent.event_date.desc())
        .all()
    )

    # Lighting schedules
    lighting_rows = (
        db.query(LightingSchedule)
        .filter(LightingSchedule.tank_id == tank.id)
        .all()
    )

    # Maturity score
    maturity_data = None
    try:
        results = compute_maturity_batch(
            db,
            str(tank.user_id),
            [(tank.id, tank.setup_date, tank.water_type or "saltwater")],
        )
        ms = results.get(str(tank.id))
        if ms and ms.get("score", 0) > 0:
            maturity_data = ms
    except Exception:
        pass

    # Report card
    report_card_data = None
    try:
        report_card_data = compute_report_card(db, str(tank.id), str(tank.user_id))
    except Exception:
        pass

    return PublicTankProfile(
        name=tank.name,
        water_type=tank.water_type or "saltwater",
        aquarium_subtype=tank.aquarium_subtype,
        display_volume_liters=tank.display_volume_liters,
        sump_volume_liters=tank.sump_volume_liters,
        total_volume_liters=tank.total_volume_liters,
        description=tank.description,
        has_image=bool(tank.image_url),
        setup_date=tank.setup_date,
        has_refugium=tank.has_refugium or False,
        refugium_volume_liters=tank.refugium_volume_liters,
        refugium_type=tank.refugium_type,
        refugium_algae=tank.refugium_algae,
        refugium_lighting_hours=tank.refugium_lighting_hours,
        maturity=maturity_data,
        report_card=report_card_data,
        livestock=[
            PublicLivestockItem(
                species_name=l.species_name,
                common_name=l.common_name,
                type=l.type,
                quantity=l.quantity,
                cached_photo_url=l.cached_photo_url,
                added_date=l.added_date,
            )
            for l in livestock_rows
        ],
        photos=[
            PublicPhotoItem(
                id=p.id,
                description=p.description,
                taken_at=p.taken_at,
            )
            for p in photo_rows
        ],
        events=[
            PublicEventItem(
                title=e.title,
                description=e.description,
                event_date=e.event_date,
                event_type=e.event_type,
            )
            for e in event_rows
        ],
        lighting=[
            PublicLightingItem(
                name=ls.name,
                description=ls.description,
                channels=ls.channels,
                schedule_data=ls.schedule_data,
                is_active=ls.is_active,
            )
            for ls in lighting_rows
        ],
        livestock_count=len(livestock_rows),
        photo_count=len(photo_rows),
        event_count=len(event_rows),
    )


@router.get("/{token}/image")
def get_shared_tank_image(token: str, db: Session = Depends(get_db)):
    """Serve the shared tank's image. No auth required."""
    tank = _get_shared_tank(token, db)

    if not tank.image_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No image")

    file_path = Path(f"/app{tank.image_url}")
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image file not found")

    return FileResponse(path=str(file_path), media_type="image/jpeg", filename=file_path.name)


@router.get("/{token}/photos/{photo_id}")
def get_shared_photo(token: str, photo_id: str, thumbnail: bool = True, db: Session = Depends(get_db)):
    """Serve a photo from the shared tank. Defaults to thumbnail."""
    tank = _get_shared_tank(token, db)

    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.tank_id == tank.id,
    ).first()

    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

    file_path = photo.thumbnail_path if thumbnail and photo.thumbnail_path else photo.file_path
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo file not found")

    return FileResponse(file_path)


@router.get("/{token}/report-card/pdf")
def get_shared_report_card_pdf(token: str, db: Session = Depends(get_db)):
    """Download the shared tank's report card as a PDF. No auth required."""
    from app.services.report_card import compute_report_card
    from app.services.report_card_pdf import generate_report_card_pdf
    from fastapi.responses import Response

    tank = _get_shared_tank(token, db)

    result = compute_report_card(db, str(tank.id), str(tank.user_id))
    if not result:
        raise HTTPException(status_code=404, detail="Report card not available")

    livestock_rows = db.query(Livestock).filter(
        Livestock.tank_id == tank.id, Livestock.status == "alive", Livestock.is_archived == False
    ).all()
    lighting_rows = db.query(LightingSchedule).filter(
        LightingSchedule.tank_id == tank.id
    ).all()

    tank_info = {
        "setup_date": str(tank.setup_date) if tank.setup_date else None,
        "display_volume_liters": tank.display_volume_liters,
        "sump_volume_liters": tank.sump_volume_liters,
        "total_volume_liters": tank.total_volume_liters,
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
