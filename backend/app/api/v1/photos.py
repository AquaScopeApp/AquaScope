"""
Photo API Endpoints

Handles photo uploads with thumbnail generation.
"""
from typing import List
from uuid import UUID, uuid4
import os
import shutil
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from PIL import Image

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.models.photo import Photo
from app.schemas.photo import PhotoResponse, PhotoUpdate
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter()

# Allowed file extensions
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "heic", "heif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Thumbnail size
THUMBNAIL_SIZE = (300, 300)


def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def convert_heic_to_jpeg(heic_path: str, jpeg_path: str) -> bool:
    """Convert HEIC image to JPEG format"""
    try:
        # Try to register HEIC opener (requires pillow-heif)
        try:
            from pillow_heif import register_heif_opener
            register_heif_opener()
        except ImportError:
            print("Warning: pillow-heif not installed, HEIC conversion may fail")
            return False

        with Image.open(heic_path) as img:
            # Convert to RGB if necessary (HEIC might have different color mode)
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            img.save(jpeg_path, 'JPEG', quality=95)
        return True
    except Exception as e:
        print(f"Error converting HEIC to JPEG: {e}")
        return False


def create_thumbnail(image_path: str, thumbnail_path: str):
    """Create a thumbnail from an image"""
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            img.thumbnail(THUMBNAIL_SIZE)
            img.save(thumbnail_path)
    except Exception as e:
        print(f"Error creating thumbnail: {e}")


@router.post("/", response_model=PhotoResponse, status_code=status.HTTP_201_CREATED)
async def upload_photo(
    file: UploadFile = File(...),
    tank_id: UUID = Form(...),
    description: str = Form(None),
    taken_at: datetime = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a photo.

    Process:
    1. Validate file type and size
    2. Verify tank ownership
    3. Save file to disk with unique name
    4. Generate thumbnail
    5. Save metadata to database
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

    # Validate file
    if not file.filename or not is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )

    # Generate unique filename
    file_ext = file.filename.rsplit(".", 1)[1].lower()
    is_heic = file_ext in ('heic', 'heif')

    # If HEIC, we'll convert to JPEG
    final_ext = 'jpg' if is_heic else file_ext
    unique_filename = f"{uuid4()}.{final_ext}"

    # Create upload directory if it doesn't exist
    upload_dir = Path(settings.UPLOAD_DIR) / str(current_user.id) / str(tank_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Save file
    file_path = upload_dir / unique_filename

    if is_heic:
        # Save temporary HEIC file first
        temp_heic_path = upload_dir / f"temp_{uuid4()}.{file_ext}"
        with open(temp_heic_path, "wb") as f:
            f.write(content)

        # Convert HEIC to JPEG
        if convert_heic_to_jpeg(str(temp_heic_path), str(file_path)):
            # Remove temporary HEIC file
            os.remove(temp_heic_path)
        else:
            # Conversion failed, save as HEIC anyway
            if os.path.exists(str(file_path)):
                os.remove(str(file_path))
            os.rename(temp_heic_path, file_path)
    else:
        # Save normal image file
        with open(file_path, "wb") as f:
            f.write(content)

    # Create thumbnail
    thumbnail_filename = f"thumb_{unique_filename}"
    thumbnail_path = upload_dir / thumbnail_filename
    try:
        create_thumbnail(str(file_path), str(thumbnail_path))
    except Exception:
        thumbnail_path = None

    # Save to database
    photo = Photo(
        tank_id=tank_id,
        user_id=current_user.id,
        filename=unique_filename,
        file_path=str(file_path),
        thumbnail_path=str(thumbnail_path) if thumbnail_path else None,
        description=description,
        taken_at=taken_at or datetime.utcnow()
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return photo


@router.get("/", response_model=List[PhotoResponse])
def list_photos(
    tank_id: UUID = Query(None, description="Filter by tank ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List photos (optionally filtered by tank)"""
    query = db.query(Photo).filter(Photo.user_id == current_user.id)

    if tank_id:
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
        query = query.filter(Photo.tank_id == tank_id)

    photos = query.order_by(Photo.taken_at.desc()).all()
    return photos


@router.get("/{photo_id}", response_model=PhotoResponse)
def get_photo(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get photo metadata"""
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.user_id == current_user.id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    return photo


@router.get("/{photo_id}/file")
def get_photo_file(
    photo_id: UUID,
    thumbnail: bool = Query(False, description="Return thumbnail instead of full image"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Serve the actual photo file"""
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.user_id == current_user.id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    file_path = photo.thumbnail_path if thumbnail and photo.thumbnail_path else photo.file_path

    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo file not found on disk"
        )

    return FileResponse(file_path)


@router.put("/{photo_id}", response_model=PhotoResponse)
def update_photo(
    photo_id: UUID,
    photo_in: PhotoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update photo metadata (description, taken_at)"""
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.user_id == current_user.id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    update_data = photo_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(photo, field, value)

    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_photo(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a photo (removes file from disk and database record)"""
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.user_id == current_user.id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    # Delete files from disk
    try:
        if os.path.exists(photo.file_path):
            os.remove(photo.file_path)
        if photo.thumbnail_path and os.path.exists(photo.thumbnail_path):
            os.remove(photo.thumbnail_path)
    except Exception as e:
        print(f"Error deleting photo files: {e}")

    # Delete database record
    db.delete(photo)
    db.commit()
    return None


@router.post("/{photo_id}/pin", response_model=PhotoResponse)
def pin_photo_as_tank_display(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pin photo as tank display image.

    Process:
    1. Find the photo
    2. Unpin any other photos for this tank
    3. Pin this photo
    """
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.user_id == current_user.id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    # Unpin all other photos for this tank
    db.query(Photo).filter(
        Photo.tank_id == photo.tank_id,
        Photo.id != photo_id
    ).update({"is_tank_display": False})

    # Pin this photo
    photo.is_tank_display = True

    # Update the tank's image_url so TankCard/TankSidebar display the pinned photo
    tank = db.query(Tank).filter(Tank.id == photo.tank_id).first()
    if tank:
        # Strip /app prefix to store as relative path (tank image endpoint prepends /app)
        relative_path = photo.file_path.replace("/app", "", 1) if photo.file_path.startswith("/app") else photo.file_path
        tank.image_url = relative_path

    db.commit()
    db.refresh(photo)

    return photo


@router.post("/{photo_id}/unpin", response_model=PhotoResponse)
def unpin_photo_as_tank_display(
    photo_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unpin photo as tank display image"""
    photo = db.query(Photo).filter(
        Photo.id == photo_id,
        Photo.user_id == current_user.id
    ).first()

    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

    photo.is_tank_display = False

    # Clear tank's image_url if no other photo is pinned
    other_pinned = db.query(Photo).filter(
        Photo.tank_id == photo.tank_id,
        Photo.id != photo_id,
        Photo.is_tank_display == True
    ).first()
    if not other_pinned:
        tank = db.query(Tank).filter(Tank.id == photo.tank_id).first()
        if tank:
            tank.image_url = None

    db.commit()
    db.refresh(photo)

    return photo
