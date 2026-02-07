"""
Admin API Endpoints

Admin-only endpoints for user management and system monitoring.
"""
from typing import List
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.models.note import Note
from app.models.photo import Photo
from app.models.livestock import Livestock
from app.models.maintenance import MaintenanceReminder
from app.schemas.user import UserResponse, UserUpdate, SystemStats
from app.api.deps import get_current_admin_user

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all users in the system (admin only).

    Query Parameters:
    - skip: Number of records to skip (default: 0)
    - limit: Maximum number of records to return (default: 100)
    """
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: UUID,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get a specific user by ID (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update user information (admin only).

    Can update:
    - username
    - is_admin status
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a user and all associated data (admin only).

    WARNING: This is a destructive operation that will:
    - Delete the user account
    - Delete all tanks owned by the user
    - Delete all parameters, photos, notes, livestock, and reminders
    - This cannot be undone

    Cascade delete is handled by SQLAlchemy relationships.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting yourself
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own admin account"
        )

    db.delete(user)
    db.commit()
    return None


@router.get("/stats", response_model=SystemStats)
def get_system_stats(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system-wide statistics (admin only).

    Returns:
    - Total counts for all entities
    - Database size
    - Active users (last 30 days)
    """
    # Count all entities
    total_users = db.query(func.count(User.id)).scalar()
    total_tanks = db.query(func.count(Tank.id)).scalar()
    total_photos = db.query(func.count(Photo.id)).scalar()
    total_notes = db.query(func.count(Note.id)).scalar()
    total_livestock = db.query(func.count(Livestock.id)).scalar()
    total_reminders = db.query(func.count(MaintenanceReminder.id)).scalar()

    # For InfluxDB parameter count, we'll estimate as it's in a different database
    # In a real implementation, you'd query InfluxDB
    total_parameters = 0  # Placeholder

    # Get database size (PostgreSQL-specific)
    try:
        db_size_query = text("SELECT pg_database_size(current_database()) / 1024.0 / 1024.0 as size_mb")
        db_size_result = db.execute(db_size_query).fetchone()
        database_size_mb = float(db_size_result[0]) if db_size_result else None
    except Exception:
        database_size_mb = None

    # Active users in last 30 days (users who logged in or created content)
    # For simplicity, we'll count users with recent tank/note/photo updates
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    active_users = db.query(func.count(func.distinct(Tank.user_id))).filter(
        Tank.updated_at >= thirty_days_ago
    ).scalar()

    return SystemStats(
        total_users=total_users,
        total_tanks=total_tanks,
        total_parameters=total_parameters,
        total_photos=total_photos,
        total_notes=total_notes,
        total_livestock=total_livestock,
        total_reminders=total_reminders,
        database_size_mb=database_size_mb,
        active_users_last_30_days=active_users
    )


@router.get("/users/{user_id}/data-summary")
def get_user_data_summary(
    user_id: UUID,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get summary of all data for a specific user (admin only).

    Returns counts of all user-owned entities.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    tanks_count = db.query(func.count(Tank.id)).filter(Tank.user_id == user_id).scalar()
    photos_count = db.query(func.count(Photo.id)).filter(Photo.user_id == user_id).scalar()
    notes_count = db.query(func.count(Note.id)).filter(Note.user_id == user_id).scalar()
    livestock_count = db.query(func.count(Livestock.id)).filter(Livestock.user_id == user_id).scalar()
    reminders_count = db.query(func.count(MaintenanceReminder.id)).filter(
        MaintenanceReminder.user_id == user_id
    ).scalar()

    return {
        "user_id": str(user_id),
        "email": user.email,
        "username": user.username,
        "tanks": tanks_count,
        "photos": photos_count,
        "notes": notes_count,
        "livestock": livestock_count,
        "reminders": reminders_count,
        "total_items": tanks_count + photos_count + notes_count + livestock_count + reminders_count
    }


@router.get("/export/{user_id}")
def export_user_data(
    user_id: UUID,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Export all data for a specific user as JSON (admin only).

    Returns a complete JSON export including:
    - User info
    - Tanks (with events)
    - Notes
    - Livestock
    - Maintenance reminders
    - Photos metadata (not the actual files)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Get all user data
    tanks = db.query(Tank).filter(Tank.user_id == user_id).all()
    notes = db.query(Note).filter(Note.user_id == user_id).all()
    photos = db.query(Photo).filter(Photo.user_id == user_id).all()
    livestock = db.query(Livestock).filter(Livestock.user_id == user_id).all()
    reminders = db.query(MaintenanceReminder).filter(MaintenanceReminder.user_id == user_id).all()

    # Convert to dict
    from app.schemas.tank import TankResponse
    from app.schemas.note import NoteResponse
    from app.schemas.photo import PhotoResponse
    from app.schemas.livestock import LivestockResponse
    from app.schemas.maintenance import MaintenanceReminderResponse

    export_data = {
        "user": {
            "email": user.email,
            "username": user.username,
            "is_admin": user.is_admin,
        },
        "tanks": [TankResponse.model_validate(t).model_dump(mode='json') for t in tanks],
        "notes": [NoteResponse.model_validate(n).model_dump(mode='json') for n in notes],
        "photos": [PhotoResponse.model_validate(p).model_dump(mode='json') for p in photos],
        "livestock": [LivestockResponse.model_validate(l).model_dump(mode='json') for l in livestock],
        "reminders": [MaintenanceReminderResponse.model_validate(r).model_dump(mode='json') for r in reminders],
        "exported_at": datetime.utcnow().isoformat(),
        "version": "1.0"
    }

    return export_data


@router.post("/import/{user_id}")
async def import_user_data(
    user_id: UUID,
    import_data: dict,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Import data for a specific user from JSON export (admin only).

    WARNING: This will ADD data to the user's account, not replace it.
    To replace, delete the user first and recreate.

    The import data should match the export format.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    imported_counts = {
        "tanks": 0,
        "notes": 0,
        "photos": 0,
        "livestock": 0,
        "reminders": 0
    }

    try:
        # Import tanks
        for tank_data in import_data.get("tanks", []):
            # Remove IDs to create new records
            tank_data.pop("id", None)
            tank_data.pop("user_id", None)
            tank_data.pop("created_at", None)
            tank_data.pop("updated_at", None)
            tank_data.pop("events", None)  # Skip events for now

            tank = Tank(**tank_data, user_id=user.id)
            db.add(tank)
            imported_counts["tanks"] += 1

        # Import notes
        for note_data in import_data.get("notes", []):
            note_data.pop("id", None)
            note_data.pop("user_id", None)
            note_data.pop("created_at", None)
            note_data.pop("updated_at", None)

            # Find tank by name or skip
            tank_id = note_data.pop("tank_id", None)
            if tank_id:
                tank = db.query(Tank).filter(
                    Tank.user_id == user.id
                ).first()
                if tank:
                    note = Note(**note_data, user_id=user.id, tank_id=tank.id)
                    db.add(note)
                    imported_counts["notes"] += 1

        # Import livestock
        for livestock_data in import_data.get("livestock", []):
            livestock_data.pop("id", None)
            livestock_data.pop("user_id", None)
            livestock_data.pop("created_at", None)

            tank_id = livestock_data.pop("tank_id", None)
            if tank_id:
                tank = db.query(Tank).filter(Tank.user_id == user.id).first()
                if tank:
                    livestock_item = Livestock(**livestock_data, user_id=user.id, tank_id=tank.id)
                    db.add(livestock_item)
                    imported_counts["livestock"] += 1

        # Import reminders
        for reminder_data in import_data.get("reminders", []):
            reminder_data.pop("id", None)
            reminder_data.pop("user_id", None)
            reminder_data.pop("created_at", None)
            reminder_data.pop("updated_at", None)

            tank_id = reminder_data.pop("tank_id", None)
            if tank_id:
                tank = db.query(Tank).filter(Tank.user_id == user.id).first()
                if tank:
                    reminder = MaintenanceReminder(**reminder_data, user_id=user.id, tank_id=tank.id)
                    db.add(reminder)
                    imported_counts["reminders"] += 1

        db.commit()

        return {
            "message": "Data imported successfully",
            "imported": imported_counts
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Import failed: {str(e)}"
        )
