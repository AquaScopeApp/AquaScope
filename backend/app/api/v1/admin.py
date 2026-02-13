"""
Admin API Endpoints

Admin-only endpoints for user management and system monitoring.
"""
import io
import os
import zipfile
from typing import List, Optional
from uuid import UUID
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.core.config import settings

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank, TankEvent
from app.models.note import Note
from app.models.photo import Photo
from app.models.livestock import Livestock
from app.models.maintenance import MaintenanceReminder
from app.models.equipment import Equipment
from app.models.icp_test import ICPTest
from app.models.parameter_range import ParameterRange
from app.models.app_settings import AppSettings
from app.models.consumable import Consumable, ConsumableUsage
from app.models.budget import Budget
from app.schemas.user import UserResponse, UserUpdate, UserWithStats, SystemStats
from app.api.deps import get_current_admin_user, get_current_user

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
    - email
    - password (will be hashed)
    - is_admin status
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    update_data = user_update.model_dump(exclude_unset=True)

    # Handle password separately - it needs to be hashed
    if "password" in update_data:
        from app.core.security import get_password_hash
        password = update_data.pop("password")
        user.hashed_password = get_password_hash(password)

    # Check if email is being changed and if it's already taken
    if "email" in update_data and update_data["email"] != user.email:
        existing_user = db.query(User).filter(User.email == update_data["email"]).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # Update other fields
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
    total_equipment = db.query(func.count(Equipment.id)).scalar()

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
        total_equipment=total_equipment,
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
    equipment = db.query(Equipment).filter(Equipment.user_id == user_id).all()
    icp_tests = db.query(ICPTest).filter(ICPTest.user_id == user_id).all()
    events = db.query(TankEvent).filter(TankEvent.user_id == user_id).all()

    # Get parameter ranges for all user tanks
    tank_ids = [t.id for t in tanks]
    param_ranges = db.query(ParameterRange).filter(ParameterRange.tank_id.in_(tank_ids)).all() if tank_ids else []

    # Get InfluxDB parameter readings
    try:
        from app.services.influxdb import influxdb_service
        parameters = influxdb_service.export_user_parameters(str(user_id))
    except Exception:
        parameters = []

    # Convert to dict
    from app.schemas.tank import TankResponse, TankEventResponse
    from app.schemas.note import NoteResponse
    from app.schemas.photo import PhotoResponse
    from app.schemas.livestock import LivestockResponse
    from app.schemas.maintenance import MaintenanceReminderResponse
    from app.schemas.equipment import EquipmentResponse
    from app.schemas.icp_test import ICPTestResponse
    from app.schemas.parameter_range import ParameterRangeResponse

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
        "equipment": [EquipmentResponse.model_validate(e).model_dump(mode='json') for e in equipment],
        "icp_tests": [ICPTestResponse.model_validate(t).model_dump(mode='json') for t in icp_tests],
        "events": [TankEventResponse.model_validate(e).model_dump(mode='json') for e in events],
        "parameter_ranges": [ParameterRangeResponse.model_validate(r).model_dump(mode='json') for r in param_ranges],
        "parameters": parameters,
        "exported_at": datetime.utcnow().isoformat(),
        "version": "1.1"
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


@router.get("/database/export")
def export_full_database(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Export the entire database as JSON (admin only).

    Returns a complete database export including:
    - All users (without passwords)
    - All tanks
    - All notes
    - All livestock
    - All maintenance reminders
    - All photos metadata

    WARNING: This exports ALL data from ALL users.
    Use for backup or migration purposes.
    """
    # Get all data from database
    all_users = db.query(User).all()
    all_tanks = db.query(Tank).all()
    all_notes = db.query(Note).all()
    all_photos = db.query(Photo).all()
    all_livestock = db.query(Livestock).all()
    all_reminders = db.query(MaintenanceReminder).all()

    # Convert to dict
    from app.schemas.tank import TankResponse
    from app.schemas.note import NoteResponse
    from app.schemas.photo import PhotoResponse
    from app.schemas.livestock import LivestockResponse
    from app.schemas.maintenance import MaintenanceReminderResponse

    export_data = {
        "users": [
            {
                "id": str(u.id),
                "email": u.email,
                "username": u.username,
                "is_admin": u.is_admin,
                "created_at": u.created_at.isoformat(),
                "updated_at": u.updated_at.isoformat()
            }
            for u in all_users
        ],
        "tanks": [TankResponse.model_validate(t).model_dump(mode='json') for t in all_tanks],
        "notes": [NoteResponse.model_validate(n).model_dump(mode='json') for n in all_notes],
        "photos": [PhotoResponse.model_validate(p).model_dump(mode='json') for p in all_photos],
        "livestock": [LivestockResponse.model_validate(l).model_dump(mode='json') for l in all_livestock],
        "reminders": [MaintenanceReminderResponse.model_validate(r).model_dump(mode='json') for r in all_reminders],
        "exported_at": datetime.utcnow().isoformat(),
        "version": "1.0",
        "total_records": {
            "users": len(all_users),
            "tanks": len(all_tanks),
            "notes": len(all_notes),
            "photos": len(all_photos),
            "livestock": len(all_livestock),
            "reminders": len(all_reminders)
        }
    }

    return export_data


@router.post("/database/import")
async def import_full_database(
    import_data: dict,
    replace: bool = False,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Import full database from JSON export (admin only).

    Parameters:
    - replace: If True, will clear existing data before import (DANGEROUS!)
               If False (default), will ADD data to existing database

    WARNING: This is a destructive operation if replace=True.
    All existing data will be deleted before import.

    The import data should match the full database export format.
    """
    imported_counts = {
        "users": 0,
        "tanks": 0,
        "notes": 0,
        "photos": 0,
        "livestock": 0,
        "reminders": 0
    }

    try:
        # If replace mode, delete all existing data (DANGEROUS!)
        if replace:
            # Delete in correct order to respect foreign keys
            db.query(MaintenanceReminder).delete()
            db.query(Livestock).delete()
            db.query(Photo).delete()
            db.query(Note).delete()
            db.query(Tank).delete()
            # Don't delete current admin user
            db.query(User).filter(User.id != admin.id).delete()
            db.commit()

        # Import users (skip if already exists by email)
        from app.core.security import get_password_hash
        user_id_mapping = {}  # Old ID -> New ID mapping

        for user_data in import_data.get("users", []):
            old_user_id = user_data.get("id")
            email = user_data.get("email")

            # Check if user already exists
            existing_user = db.query(User).filter(User.email == email).first()
            if existing_user:
                user_id_mapping[old_user_id] = str(existing_user.id)
                continue

            # Create new user with default password
            new_user = User(
                email=email,
                username=user_data.get("username", "Imported User"),
                hashed_password=get_password_hash("changeme123"),  # Default password
                is_admin=user_data.get("is_admin", False)
            )
            db.add(new_user)
            db.flush()  # Get the new ID
            user_id_mapping[old_user_id] = str(new_user.id)
            imported_counts["users"] += 1

        # Import tanks
        tank_id_mapping = {}  # Old ID -> New ID mapping
        for tank_data in import_data.get("tanks", []):
            old_tank_id = tank_data.get("id")
            old_user_id = tank_data.get("user_id")
            new_user_id = user_id_mapping.get(old_user_id)

            if not new_user_id:
                continue

            tank_data_clean = {k: v for k, v in tank_data.items()
                             if k not in ["id", "user_id", "created_at", "updated_at", "events"]}

            new_tank = Tank(**tank_data_clean, user_id=new_user_id)
            db.add(new_tank)
            db.flush()
            tank_id_mapping[old_tank_id] = str(new_tank.id)
            imported_counts["tanks"] += 1

        # Import notes
        for note_data in import_data.get("notes", []):
            old_user_id = note_data.get("user_id")
            old_tank_id = note_data.get("tank_id")
            new_user_id = user_id_mapping.get(old_user_id)
            new_tank_id = tank_id_mapping.get(old_tank_id)

            if not new_user_id or not new_tank_id:
                continue

            note_data_clean = {k: v for k, v in note_data.items()
                             if k not in ["id", "user_id", "tank_id", "created_at", "updated_at"]}

            new_note = Note(**note_data_clean, user_id=new_user_id, tank_id=new_tank_id)
            db.add(new_note)
            imported_counts["notes"] += 1

        # Import livestock
        for livestock_data in import_data.get("livestock", []):
            old_user_id = livestock_data.get("user_id")
            old_tank_id = livestock_data.get("tank_id")
            new_user_id = user_id_mapping.get(old_user_id)
            new_tank_id = tank_id_mapping.get(old_tank_id)

            if not new_user_id or not new_tank_id:
                continue

            livestock_data_clean = {k: v for k, v in livestock_data.items()
                                  if k not in ["id", "user_id", "tank_id", "created_at"]}

            new_livestock = Livestock(**livestock_data_clean, user_id=new_user_id, tank_id=new_tank_id)
            db.add(new_livestock)
            imported_counts["livestock"] += 1

        # Import reminders
        for reminder_data in import_data.get("reminders", []):
            old_user_id = reminder_data.get("user_id")
            old_tank_id = reminder_data.get("tank_id")
            new_user_id = user_id_mapping.get(old_user_id)
            new_tank_id = tank_id_mapping.get(old_tank_id)

            if not new_user_id or not new_tank_id:
                continue

            reminder_data_clean = {k: v for k, v in reminder_data.items()
                                 if k not in ["id", "user_id", "tank_id", "created_at", "updated_at"]}

            new_reminder = MaintenanceReminder(**reminder_data_clean, user_id=new_user_id, tank_id=new_tank_id)
            db.add(new_reminder)
            imported_counts["reminders"] += 1

        db.commit()

        return {
            "message": "Database import successful",
            "imported": imported_counts,
            "note": "Imported users have default password 'changeme123' - please reset passwords"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database import failed: {str(e)}"
        )


@router.get("/users-with-stats", response_model=List[UserWithStats])
def list_users_with_stats(
    skip: int = 0,
    limit: int = 100,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all users with per-user record counts and data size (admin only).

    Returns users with tank_count, livestock_count, equipment_count,
    photo_count, note_count, reminder_count, total_records, and data_size_mb.
    """
    users = db.query(User).offset(skip).limit(limit).all()

    results = []
    for u in users:
        tank_count = db.query(func.count(Tank.id)).filter(Tank.user_id == u.id).scalar() or 0
        livestock_count = db.query(func.count(Livestock.id)).filter(Livestock.user_id == u.id).scalar() or 0
        equipment_count = db.query(func.count(Equipment.id)).filter(Equipment.user_id == u.id).scalar() or 0
        photo_count = db.query(func.count(Photo.id)).filter(Photo.user_id == u.id).scalar() or 0
        note_count = db.query(func.count(Note.id)).filter(Note.user_id == u.id).scalar() or 0
        reminder_count = db.query(func.count(MaintenanceReminder.id)).filter(
            MaintenanceReminder.user_id == u.id
        ).scalar() or 0

        total = tank_count + livestock_count + equipment_count + photo_count + note_count + reminder_count

        # Calculate per-user data size in MB: PostgreSQL rows + files on disk
        try:
            # 1. PostgreSQL row sizes
            size_query = text("""
                SELECT (
                    COALESCE((SELECT SUM(pg_column_size(t.*)) FROM tanks t WHERE t.user_id = :uid), 0) +
                    COALESCE((SELECT SUM(pg_column_size(n.*)) FROM notes n WHERE n.user_id = :uid), 0) +
                    COALESCE((SELECT SUM(pg_column_size(p.*)) FROM photos p WHERE p.user_id = :uid), 0) +
                    COALESCE((SELECT SUM(pg_column_size(l.*)) FROM livestock l WHERE l.user_id = :uid), 0) +
                    COALESCE((SELECT SUM(pg_column_size(m.*)) FROM maintenance_reminders m WHERE m.user_id = :uid), 0) +
                    COALESCE((SELECT SUM(pg_column_size(e.*)) FROM equipment e WHERE e.user_id = :uid), 0) +
                    COALESCE((SELECT SUM(pg_column_size(i.*)) FROM icp_tests i WHERE i.user_id = :uid), 0) +
                    COALESCE((SELECT SUM(pg_column_size(te.*)) FROM tank_events te WHERE te.user_id = :uid), 0) +
                    COALESCE((SELECT SUM(pg_column_size(pr.*)) FROM parameter_ranges pr
                        WHERE pr.tank_id IN (SELECT id FROM tanks WHERE user_id = :uid)), 0)
                ) as size_bytes
            """)
            size_result = db.execute(size_query, {"uid": str(u.id)}).fetchone()
            db_bytes = float(size_result[0]) if size_result else 0.0

            # 2. Photo + thumbnail files on disk
            user_upload_dir = Path(settings.UPLOAD_DIR) / str(u.id)
            file_bytes = 0.0
            if user_upload_dir.exists():
                for f in user_upload_dir.rglob("*"):
                    if f.is_file():
                        file_bytes += f.stat().st_size

            # 3. ICP test PDF files
            icp_pdfs = db.query(ICPTest.pdf_path).filter(
                ICPTest.user_id == u.id, ICPTest.pdf_path.isnot(None)
            ).all()
            for (pdf_path,) in icp_pdfs:
                p = Path(pdf_path)
                if not p.is_absolute():
                    p = Path("/app") / p
                if p.exists():
                    file_bytes += p.stat().st_size

            data_size_mb = round((db_bytes + file_bytes) / 1024.0 / 1024.0, 3)
        except Exception:
            data_size_mb = 0.0

        results.append(UserWithStats(
            id=u.id,
            email=u.email,
            username=u.username,
            is_admin=u.is_admin,
            created_at=u.created_at,
            updated_at=u.updated_at,
            tank_count=tank_count,
            livestock_count=livestock_count,
            equipment_count=equipment_count,
            photo_count=photo_count,
            note_count=note_count,
            reminder_count=reminder_count,
            total_records=total,
            data_size_mb=data_size_mb,
        ))

    return results


@router.get("/export/{user_id}/tank/{tank_id}")
def export_tank_data(
    user_id: UUID,
    tank_id: UUID,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Export all data for a specific tank as JSON (admin only).

    Includes tank info, notes, photos, livestock, equipment,
    maintenance reminders, events, ICP tests, parameter ranges,
    and InfluxDB parameter readings.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    tank = db.query(Tank).filter(Tank.id == tank_id, Tank.user_id == user_id).first()
    if not tank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tank not found")

    from app.schemas.tank import TankResponse, TankEventResponse
    from app.schemas.note import NoteResponse
    from app.schemas.photo import PhotoResponse
    from app.schemas.livestock import LivestockResponse
    from app.schemas.maintenance import MaintenanceReminderResponse
    from app.schemas.equipment import EquipmentResponse
    from app.schemas.icp_test import ICPTestResponse
    from app.schemas.parameter_range import ParameterRangeResponse

    notes = db.query(Note).filter(Note.tank_id == tank_id).all()
    photos = db.query(Photo).filter(Photo.tank_id == tank_id).all()
    livestock = db.query(Livestock).filter(Livestock.tank_id == tank_id).all()
    equipment = db.query(Equipment).filter(Equipment.tank_id == tank_id).all()
    reminders = db.query(MaintenanceReminder).filter(MaintenanceReminder.tank_id == tank_id).all()
    events = db.query(TankEvent).filter(TankEvent.tank_id == tank_id).all()
    icp_tests = db.query(ICPTest).filter(ICPTest.tank_id == tank_id).all()
    param_ranges = db.query(ParameterRange).filter(ParameterRange.tank_id == tank_id).all()

    # Get InfluxDB parameter readings
    try:
        from app.services.influxdb import influxdb_service
        parameters = influxdb_service.export_tank_parameters(str(user_id), str(tank_id))
    except Exception:
        parameters = []

    return {
        "user": {"email": user.email, "username": user.username},
        "tank": TankResponse.model_validate(tank).model_dump(mode='json'),
        "notes": [NoteResponse.model_validate(n).model_dump(mode='json') for n in notes],
        "photos": [PhotoResponse.model_validate(p).model_dump(mode='json') for p in photos],
        "livestock": [LivestockResponse.model_validate(l).model_dump(mode='json') for l in livestock],
        "equipment": [EquipmentResponse.model_validate(e).model_dump(mode='json') for e in equipment],
        "reminders": [MaintenanceReminderResponse.model_validate(r).model_dump(mode='json') for r in reminders],
        "events": [TankEventResponse.model_validate(e).model_dump(mode='json') for e in events],
        "icp_tests": [ICPTestResponse.model_validate(t).model_dump(mode='json') for t in icp_tests],
        "parameter_ranges": [ParameterRangeResponse.model_validate(r).model_dump(mode='json') for r in param_ranges],
        "parameters": parameters,
        "exported_at": datetime.utcnow().isoformat(),
        "version": "1.0"
    }


# ============================================================================
# Storage Management Endpoints
# ============================================================================

def _resolve_path(file_path: str) -> Path:
    """Resolve a DB file path to an absolute path on disk."""
    upload_dir = Path(settings.UPLOAD_DIR)
    # "/uploads/..." -> treat as relative to UPLOAD_DIR parent
    if file_path.startswith("/uploads/"):
        return upload_dir / file_path[len("/uploads/"):]
    # "uploads/..." -> strip prefix
    if file_path.startswith("uploads/"):
        return upload_dir / file_path[len("uploads/"):]
    # Already absolute (e.g. "/app/uploads/...")
    p = Path(file_path)
    if p.is_absolute():
        return p
    return upload_dir / file_path


def _get_db_file_records(db: Session) -> list:
    """Build a list of all file references from the database."""
    records = []

    # Photos (file + thumbnail)
    photos = db.query(Photo).all()
    for p in photos:
        user = db.query(User).filter(User.id == p.user_id).first()
        tank = db.query(Tank).filter(Tank.id == p.tank_id).first() if p.tank_id else None
        if p.file_path:
            records.append({
                "db_path": p.file_path,
                "abs_path": _resolve_path(p.file_path),
                "category": "photos",
                "user_id": str(p.user_id),
                "owner_email": user.email if user else None,
                "tank_name": tank.name if tank else None,
            })
        if p.thumbnail_path:
            records.append({
                "db_path": p.thumbnail_path,
                "abs_path": _resolve_path(p.thumbnail_path),
                "category": "thumbnails",
                "user_id": str(p.user_id),
                "owner_email": user.email if user else None,
                "tank_name": tank.name if tank else None,
            })

    # Tank images
    tanks = db.query(Tank).filter(Tank.image_url.isnot(None)).all()
    for t in tanks:
        user = db.query(User).filter(User.id == t.user_id).first()
        records.append({
            "db_path": t.image_url,
            "abs_path": _resolve_path(t.image_url),
            "category": "tank-images",
            "user_id": str(t.user_id),
            "owner_email": user.email if user else None,
            "tank_name": t.name,
        })

    # ICP test PDFs
    icp_tests = db.query(ICPTest).filter(ICPTest.pdf_path.isnot(None)).all()
    for icp in icp_tests:
        user = db.query(User).filter(User.id == icp.user_id).first()
        tank = db.query(Tank).filter(Tank.id == icp.tank_id).first() if icp.tank_id else None
        records.append({
            "db_path": icp.pdf_path,
            "abs_path": _resolve_path(icp.pdf_path),
            "category": "icp-tests",
            "user_id": str(icp.user_id),
            "owner_email": user.email if user else None,
            "tank_name": tank.name if tank else None,
        })

    return records


def _get_known_abs_paths(db_records: list) -> set:
    """Get the set of absolute paths that the DB knows about."""
    return {str(r["abs_path"]) for r in db_records}


@router.get("/storage/stats")
def get_storage_stats(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get storage usage statistics derived from database records and disk state."""
    upload_dir = Path(settings.UPLOAD_DIR)
    db_records = _get_db_file_records(db)
    known_abs = _get_known_abs_paths(db_records)

    categories: dict = {}
    per_user: dict = {}
    total_size = 0
    total_files = len(db_records)
    missing_count = 0
    files_on_disk = 0

    for rec in db_records:
        cat = rec["category"]
        uid = rec["user_id"]
        exists = rec["abs_path"].is_file()
        size = rec["abs_path"].stat().st_size if exists else 0

        total_size += size
        if exists:
            files_on_disk += 1
        else:
            missing_count += 1

        if cat not in categories:
            categories[cat] = {"count": 0, "size_bytes": 0, "missing": 0}
        categories[cat]["count"] += 1
        categories[cat]["size_bytes"] += size
        if not exists:
            categories[cat]["missing"] += 1

        if uid not in per_user:
            per_user[uid] = {
                "user_id": uid,
                "email": rec["owner_email"] or "unknown",
                "count": 0,
                "size_bytes": 0,
                "missing": 0,
            }
        per_user[uid]["count"] += 1
        per_user[uid]["size_bytes"] += size
        if not exists:
            per_user[uid]["missing"] += 1

    # Scan disk for orphans (files not referenced in DB)
    orphan_count = 0
    orphan_size_bytes = 0
    if upload_dir.exists():
        for root, _dirs, files in os.walk(upload_dir):
            for fname in files:
                full_path = Path(root) / fname
                if str(full_path) not in known_abs:
                    orphan_count += 1
                    orphan_size_bytes += full_path.stat().st_size
                    total_size += full_path.stat().st_size

    return {
        "total_size_bytes": total_size,
        "total_files": total_files + orphan_count,
        "files_on_disk": files_on_disk + orphan_count,
        "missing_count": missing_count,
        "categories": categories,
        "per_user": list(per_user.values()),
        "orphan_count": orphan_count,
        "orphan_size_bytes": orphan_size_bytes,
    }


@router.get("/storage/files")
def list_storage_files(
    user_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Browse files starting from DB records, then add disk-only orphans."""
    upload_dir = Path(settings.UPLOAD_DIR)
    db_records = _get_db_file_records(db)
    known_abs = _get_known_abs_paths(db_records)

    files = []

    # 1. DB-referenced files (always shown, even when missing from disk)
    for rec in db_records:
        file_category = rec["category"]
        file_user_id = rec["user_id"]

        if category and file_category != category:
            continue
        if user_id and file_user_id != user_id:
            continue

        exists = rec["abs_path"].is_file()
        size = rec["abs_path"].stat().st_size if exists else 0
        modified = (
            datetime.fromtimestamp(rec["abs_path"].stat().st_mtime).isoformat()
            if exists else None
        )

        try:
            rel_path = str(rec["abs_path"].relative_to(upload_dir))
        except ValueError:
            rel_path = rec["db_path"]

        files.append({
            "name": rec["abs_path"].name,
            "path": rel_path,
            "size_bytes": size,
            "modified": modified,
            "category": file_category,
            "user_id": file_user_id,
            "owner_email": rec["owner_email"],
            "tank_name": rec["tank_name"],
            "is_orphan": False,
            "is_missing": not exists,
        })

    # 2. Disk-only orphans (files not in any DB record)
    if upload_dir.exists():
        for root, _dirs, filenames in os.walk(upload_dir):
            for fname in filenames:
                full_path = Path(root) / fname
                if str(full_path) in known_abs:
                    continue

                rel_to_uploads = str(full_path.relative_to(upload_dir))
                stat = full_path.stat()

                if "tank-images" in rel_to_uploads:
                    file_category = "tank-images"
                elif "icp_tests" in rel_to_uploads:
                    file_category = "icp-tests"
                elif "thumb_" in fname:
                    file_category = "thumbnails"
                else:
                    file_category = "photos"

                if category and file_category != category:
                    continue

                parts = Path(rel_to_uploads).parts
                file_user_id = None
                if parts and parts[0] not in ("tank-images", "icp_tests"):
                    file_user_id = parts[0]
                if user_id and file_user_id != user_id:
                    continue

                owner_email = None
                if file_user_id:
                    u = db.query(User).filter(User.id == file_user_id).first()
                    owner_email = u.email if u else None

                files.append({
                    "name": fname,
                    "path": rel_to_uploads,
                    "size_bytes": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "category": file_category,
                    "user_id": file_user_id,
                    "owner_email": owner_email,
                    "tank_name": None,
                    "is_orphan": True,
                    "is_missing": False,
                })

    # Show missing files first, then by date
    files.sort(key=lambda f: (not f["is_missing"], f["modified"] or ""), reverse=True)
    return files


@router.delete("/storage/orphans")
def delete_orphan_files(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Find and delete files on disk with no matching database record."""
    upload_dir = Path(settings.UPLOAD_DIR)
    if not upload_dir.exists():
        return {"deleted": 0, "freed_bytes": 0}

    known_abs = _get_known_abs_paths(_get_db_file_records(db))
    deleted = 0
    freed_bytes = 0

    for root, _dirs, filenames in os.walk(upload_dir):
        for fname in filenames:
            full_path = Path(root) / fname
            if str(full_path) not in known_abs:
                size = full_path.stat().st_size
                full_path.unlink()
                deleted += 1
                freed_bytes += size

    # Clean up empty directories
    for root, dirs, files in os.walk(upload_dir, topdown=False):
        for d in dirs:
            dir_path = Path(root) / d
            if not any(dir_path.iterdir()):
                dir_path.rmdir()

    return {"deleted": deleted, "freed_bytes": freed_bytes}


@router.get("/storage/download/{file_path:path}")
def download_file(
    file_path: str,
    admin: User = Depends(get_current_admin_user),
):
    """Download a single file from storage."""
    upload_dir = Path(settings.UPLOAD_DIR)
    full_path = (upload_dir / file_path).resolve()

    # Prevent path traversal
    if not str(full_path).startswith(str(upload_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(full_path),
        filename=full_path.name,
        media_type="application/octet-stream",
    )


@router.get("/storage/download-all")
def download_all_files(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Download all uploaded files plus database export as a ZIP archive."""
    import json

    upload_dir = Path(settings.UPLOAD_DIR)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add all uploaded files
        if upload_dir.exists():
            for root, _dirs, files in os.walk(upload_dir):
                for fname in files:
                    full_path = Path(root) / fname
                    arcname = "uploads/" + str(full_path.relative_to(upload_dir))
                    zf.write(full_path, arcname)

        # Add database export as JSON
        db_export = export_full_database(admin=admin, db=db)
        zf.writestr("database.json", json.dumps(db_export, indent=2, default=str))

    buf.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="aquascope_backup_{timestamp}.zip"'},
    )


@router.post("/storage/export")
def selective_export(
    body: dict,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Selective export as ZIP archive.

    Body JSON:
    {
      "user_ids": ["uuid", ...] | null,      // null = all users
      "tank_ids": ["uuid", ...] | null,      // null = all tanks for selected users
      "data_types": ["tanks", "notes", ...] | null,  // null = all types
      "include_files": true                   // include uploaded files
    }

    data_types options: tanks, notes, photos, livestock, equipment,
                        maintenance, icp_tests, consumables, budgets,
                        events, parameter_ranges, parameters, settings
    """
    import json

    user_ids = body.get("user_ids")  # list of str or None
    tank_ids = body.get("tank_ids")  # list of str or None
    data_types = body.get("data_types")  # list of str or None (all)
    include_files = body.get("include_files", True)

    def want(dtype: str) -> bool:
        return data_types is None or dtype in data_types

    # Resolve users
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
    else:
        users = db.query(User).all()
    user_id_set = {str(u.id) for u in users}

    # Resolve tanks
    if tank_ids:
        tanks = db.query(Tank).filter(Tank.id.in_(tank_ids)).all()
    else:
        tanks = db.query(Tank).filter(Tank.user_id.in_(user_id_set)).all()
    tank_id_set = {str(t.id) for t in tanks}

    # Schema imports
    from app.schemas.tank import TankResponse, TankEventResponse
    from app.schemas.note import NoteResponse
    from app.schemas.photo import PhotoResponse
    from app.schemas.livestock import LivestockResponse
    from app.schemas.maintenance import MaintenanceReminderResponse
    from app.schemas.equipment import EquipmentResponse
    from app.schemas.icp_test import ICPTestResponse
    from app.schemas.parameter_range import ParameterRangeResponse
    from app.schemas.consumable import ConsumableResponse, ConsumableUsageResponse
    from app.schemas.budget import BudgetResponse

    export_data = {
        "version": "2.0",
        "exported_at": datetime.utcnow().isoformat(),
        "users": [
            {"id": str(u.id), "email": u.email, "username": u.username,
             "is_admin": u.is_admin, "created_at": u.created_at.isoformat(),
             "updated_at": u.updated_at.isoformat()}
            for u in users
        ],
    }

    # Collect file paths to include
    file_paths = set()

    if want("tanks"):
        export_data["tanks"] = [
            TankResponse.model_validate(t).model_dump(mode='json') for t in tanks
        ]
        for t in tanks:
            if t.image_url:
                file_paths.add(t.image_url)

    if want("notes"):
        notes = db.query(Note).filter(Note.user_id.in_(user_id_set), Note.tank_id.in_(tank_id_set)).all()
        export_data["notes"] = [NoteResponse.model_validate(n).model_dump(mode='json') for n in notes]

    if want("photos"):
        photos = db.query(Photo).filter(Photo.user_id.in_(user_id_set), Photo.tank_id.in_(tank_id_set)).all()
        export_data["photos"] = [PhotoResponse.model_validate(p).model_dump(mode='json') for p in photos]
        for p in photos:
            if p.file_path:
                file_paths.add(p.file_path)
            if p.thumbnail_path:
                file_paths.add(p.thumbnail_path)

    if want("livestock"):
        livestock = db.query(Livestock).filter(Livestock.user_id.in_(user_id_set), Livestock.tank_id.in_(tank_id_set)).all()
        export_data["livestock"] = [LivestockResponse.model_validate(l).model_dump(mode='json') for l in livestock]

    if want("equipment"):
        equipment = db.query(Equipment).filter(Equipment.user_id.in_(user_id_set), Equipment.tank_id.in_(tank_id_set)).all()
        export_data["equipment"] = [EquipmentResponse.model_validate(e).model_dump(mode='json') for e in equipment]

    if want("maintenance"):
        reminders = db.query(MaintenanceReminder).filter(
            MaintenanceReminder.user_id.in_(user_id_set), MaintenanceReminder.tank_id.in_(tank_id_set)
        ).all()
        export_data["reminders"] = [MaintenanceReminderResponse.model_validate(r).model_dump(mode='json') for r in reminders]

    if want("icp_tests"):
        icp_tests = db.query(ICPTest).filter(ICPTest.user_id.in_(user_id_set), ICPTest.tank_id.in_(tank_id_set)).all()
        export_data["icp_tests"] = [ICPTestResponse.model_validate(t).model_dump(mode='json') for t in icp_tests]
        for icp in icp_tests:
            if icp.pdf_path:
                file_paths.add(icp.pdf_path)

    if want("consumables"):
        consumables = db.query(Consumable).filter(Consumable.user_id.in_(user_id_set), Consumable.tank_id.in_(tank_id_set)).all()
        export_data["consumables"] = [ConsumableResponse.model_validate(c).model_dump(mode='json') for c in consumables]
        consumable_ids = {str(c.id) for c in consumables}
        usages = db.query(ConsumableUsage).filter(ConsumableUsage.consumable_id.in_(consumable_ids)).all() if consumable_ids else []
        export_data["consumable_usage"] = [ConsumableUsageResponse.model_validate(u).model_dump(mode='json') for u in usages]

    if want("budgets"):
        budgets = db.query(Budget).filter(Budget.user_id.in_(user_id_set)).all()
        export_data["budgets"] = [BudgetResponse.model_validate(b).model_dump(mode='json') for b in budgets]

    if want("events"):
        events = db.query(TankEvent).filter(TankEvent.user_id.in_(user_id_set), TankEvent.tank_id.in_(tank_id_set)).all()
        export_data["events"] = [TankEventResponse.model_validate(e).model_dump(mode='json') for e in events]

    if want("parameter_ranges"):
        param_ranges = db.query(ParameterRange).filter(ParameterRange.tank_id.in_(tank_id_set)).all()
        export_data["parameter_ranges"] = [ParameterRangeResponse.model_validate(r).model_dump(mode='json') for r in param_ranges]

    if want("parameters"):
        try:
            from app.services.influxdb import influxdb_service
            all_params = []
            for uid in user_id_set:
                all_params.extend(influxdb_service.export_user_parameters(uid))
            export_data["parameters"] = all_params
        except Exception:
            export_data["parameters"] = []

    if want("settings"):
        all_settings = db.query(AppSettings).all()
        export_data["settings"] = {s.key: s.value for s in all_settings}

    # Record counts
    export_data["total_records"] = {
        k: len(v) if isinstance(v, list) else 1
        for k, v in export_data.items()
        if k not in ("version", "exported_at", "total_records")
    }

    # Build ZIP
    upload_dir = Path(settings.UPLOAD_DIR)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("database.json", json.dumps(export_data, indent=2, default=str))

        if include_files:
            for fpath in file_paths:
                abs_path = _resolve_path(fpath)
                if abs_path.is_file():
                    try:
                        arcname = "uploads/" + str(abs_path.relative_to(upload_dir))
                    except ValueError:
                        arcname = "uploads/" + abs_path.name
                    zf.write(abs_path, arcname)

            # Also include banner image if settings are included
            if want("settings"):
                banner_row = db.query(AppSettings).filter(AppSettings.key == "banner_image").first()
                if banner_row and banner_row.value:
                    banner_path = _resolve_path(banner_row.value)
                    if banner_path.is_file():
                        try:
                            arcname = "uploads/" + str(banner_path.relative_to(upload_dir))
                        except ValueError:
                            arcname = "uploads/" + banner_path.name
                        zf.write(banner_path, arcname)

    buf.seek(0)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="aquascope_export_{timestamp}.zip"'},
    )


@router.post("/storage/import-zip")
async def import_from_zip(
    file: UploadFile = File(...),
    replace: bool = Query(False),
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Import data from a ZIP archive (created by selective export or download-all).

    The ZIP should contain:
    - database.json: exported data
    - uploads/: uploaded files (photos, tank images, ICP PDFs, etc.)

    If replace=True, existing data for the imported users will be cleared first.
    """
    import json
    from app.core.security import get_password_hash

    contents = await file.read()
    buf = io.BytesIO(contents)

    try:
        zf = zipfile.ZipFile(buf, "r")
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file")

    # Extract database.json
    if "database.json" not in zf.namelist():
        raise HTTPException(status_code=400, detail="ZIP does not contain database.json")

    import_data = json.loads(zf.read("database.json"))

    imported_counts = {
        "users": 0, "tanks": 0, "notes": 0, "photos": 0,
        "livestock": 0, "equipment": 0, "reminders": 0,
        "icp_tests": 0, "consumables": 0, "consumable_usage": 0,
        "budgets": 0, "events": 0, "parameter_ranges": 0, "files": 0,
    }

    try:
        # Build ID mappings
        user_id_mapping = {}
        tank_id_mapping = {}

        # If replace mode, clear data for users being imported
        if replace:
            import_emails = {u.get("email") for u in import_data.get("users", [])}
            existing_users = db.query(User).filter(User.email.in_(import_emails)).all()
            for eu in existing_users:
                if eu.id != admin.id:
                    # Delete user's data (cascades will handle related records)
                    db.query(ConsumableUsage).filter(
                        ConsumableUsage.consumable_id.in_(
                            db.query(Consumable.id).filter(Consumable.user_id == eu.id)
                        )
                    ).delete(synchronize_session=False)
                    db.query(Consumable).filter(Consumable.user_id == eu.id).delete()
                    db.query(Budget).filter(Budget.user_id == eu.id).delete()
                    db.query(MaintenanceReminder).filter(MaintenanceReminder.user_id == eu.id).delete()
                    db.query(Equipment).filter(Equipment.user_id == eu.id).delete()
                    db.query(Livestock).filter(Livestock.user_id == eu.id).delete()
                    db.query(Photo).filter(Photo.user_id == eu.id).delete()
                    db.query(Note).filter(Note.user_id == eu.id).delete()
                    db.query(ICPTest).filter(ICPTest.user_id == eu.id).delete()
                    db.query(TankEvent).filter(TankEvent.user_id == eu.id).delete()
                    db.query(ParameterRange).filter(
                        ParameterRange.tank_id.in_(
                            db.query(Tank.id).filter(Tank.user_id == eu.id)
                        )
                    ).delete(synchronize_session=False)
                    db.query(Tank).filter(Tank.user_id == eu.id).delete()
            db.flush()

        # Import users
        for user_data in import_data.get("users", []):
            old_id = user_data.get("id")
            email = user_data.get("email")
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                user_id_mapping[old_id] = str(existing.id)
                continue
            new_user = User(
                email=email,
                username=user_data.get("username", "Imported User"),
                hashed_password=get_password_hash("changeme123"),
                is_admin=user_data.get("is_admin", False),
            )
            db.add(new_user)
            db.flush()
            user_id_mapping[old_id] = str(new_user.id)
            imported_counts["users"] += 1

        # Import tanks
        for tank_data in import_data.get("tanks", []):
            old_id = tank_data.get("id")
            new_uid = user_id_mapping.get(tank_data.get("user_id"))
            if not new_uid:
                continue
            clean = {k: v for k, v in tank_data.items()
                     if k not in ("id", "user_id", "created_at", "updated_at", "events", "total_volume_liters")}
            new_tank = Tank(**clean, user_id=new_uid)
            db.add(new_tank)
            db.flush()
            tank_id_mapping[old_id] = str(new_tank.id)
            imported_counts["tanks"] += 1

        # Helper to map user+tank IDs
        def map_ids(data, skip_keys=("id", "created_at", "updated_at")):
            uid = user_id_mapping.get(data.get("user_id"))
            tid = tank_id_mapping.get(data.get("tank_id"))
            if not uid or not tid:
                return None, None, None
            clean = {k: v for k, v in data.items()
                     if k not in (*skip_keys, "user_id", "tank_id")}
            return uid, tid, clean

        # Import notes
        for d in import_data.get("notes", []):
            uid, tid, clean = map_ids(d)
            if clean:
                db.add(Note(**clean, user_id=uid, tank_id=tid))
                imported_counts["notes"] += 1

        # Import photos
        for d in import_data.get("photos", []):
            uid, tid, clean = map_ids(d)
            if clean:
                db.add(Photo(**clean, user_id=uid, tank_id=tid))
                imported_counts["photos"] += 1

        # Import livestock
        for d in import_data.get("livestock", []):
            uid, tid, clean = map_ids(d)
            if clean:
                db.add(Livestock(**clean, user_id=uid, tank_id=tid))
                imported_counts["livestock"] += 1

        # Import equipment (track ID mapping for reminders)
        equipment_id_mapping = {}
        for d in import_data.get("equipment", []):
            uid, tid, clean = map_ids(d)
            if clean:
                old_id = d.get("id")
                new_eq = Equipment(**clean, user_id=uid, tank_id=tid)
                db.add(new_eq)
                db.flush()
                equipment_id_mapping[old_id] = str(new_eq.id)
                imported_counts["equipment"] += 1

        # Import maintenance reminders (remap equipment_id)
        for d in import_data.get("reminders", []):
            uid, tid, clean = map_ids(d, skip_keys=("id", "created_at", "updated_at", "equipment_id"))
            if clean:
                old_eq_id = d.get("equipment_id")
                new_eq_id = equipment_id_mapping.get(old_eq_id) if old_eq_id else None
                db.add(MaintenanceReminder(**clean, user_id=uid, tank_id=tid, equipment_id=new_eq_id))
                imported_counts["reminders"] += 1

        # Import ICP tests
        for d in import_data.get("icp_tests", []):
            uid, tid, clean = map_ids(d)
            if clean:
                db.add(ICPTest(**clean, user_id=uid, tank_id=tid))
                imported_counts["icp_tests"] += 1

        # Import events
        for d in import_data.get("events", []):
            uid, tid, clean = map_ids(d)
            if clean:
                db.add(TankEvent(**clean, user_id=uid, tank_id=tid))
                imported_counts["events"] += 1

        # Import parameter ranges
        for d in import_data.get("parameter_ranges", []):
            tid = tank_id_mapping.get(d.get("tank_id"))
            if not tid:
                continue
            clean = {k: v for k, v in d.items() if k not in ("id", "tank_id", "created_at", "updated_at")}
            db.add(ParameterRange(**clean, tank_id=tid))
            imported_counts["parameter_ranges"] += 1

        # Import consumables
        consumable_id_mapping = {}
        for d in import_data.get("consumables", []):
            uid, tid, clean = map_ids(d, skip_keys=("id", "created_at", "updated_at", "usage_count", "total_used"))
            if clean:
                old_id = d.get("id")
                new_c = Consumable(**clean, user_id=uid, tank_id=tid)
                db.add(new_c)
                db.flush()
                consumable_id_mapping[old_id] = str(new_c.id)
                imported_counts["consumables"] += 1

        # Import consumable usage
        for d in import_data.get("consumable_usage", []):
            new_cid = consumable_id_mapping.get(d.get("consumable_id"))
            if not new_cid:
                continue
            clean = {k: v for k, v in d.items() if k not in ("id", "consumable_id", "created_at")}
            db.add(ConsumableUsage(**clean, consumable_id=new_cid))
            imported_counts["consumable_usage"] += 1

        # Import budgets
        for d in import_data.get("budgets", []):
            uid = user_id_mapping.get(d.get("user_id"))
            if not uid:
                continue
            tid = tank_id_mapping.get(d.get("tank_id")) if d.get("tank_id") else None
            clean = {k: v for k, v in d.items() if k not in ("id", "user_id", "tank_id", "created_at", "updated_at")}
            db.add(Budget(**clean, user_id=uid, tank_id=tid))
            imported_counts["budgets"] += 1

        # Import settings
        if "settings" in import_data and isinstance(import_data["settings"], dict):
            for key, value in import_data["settings"].items():
                existing = db.query(AppSettings).filter(AppSettings.key == key).first()
                if existing:
                    existing.value = value
                else:
                    db.add(AppSettings(key=key, value=value))

        db.commit()

        # Extract uploaded files from ZIP
        upload_dir = Path(settings.UPLOAD_DIR)
        for name in zf.namelist():
            if name.startswith("uploads/") and not name.endswith("/"):
                rel = name[len("uploads/"):]
                dest = upload_dir / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(name) as src, open(dest, "wb") as dst:
                    dst.write(src.read())
                imported_counts["files"] += 1

        zf.close()

        return {
            "message": "Import successful",
            "imported": imported_counts,
            "note": "New users have default password 'changeme123' - please reset passwords" if imported_counts["users"] > 0 else None,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


# ============================================================================
# Module Settings
# ============================================================================

# Default modules — Parameters and Tanks are always on (core)
MODULE_KEYS = [
    "modules.photos",
    "modules.notes",
    "modules.livestock",
    "modules.equipment",
    "modules.consumables",
    "modules.maintenance",
    "modules.icp_tests",
    "modules.feeding",
    "modules.finances",
    "modules.diseases",
]

MODULE_DEFAULTS = {k: "true" for k in MODULE_KEYS}


@router.get("/settings/modules")
def get_module_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get enabled/disabled state for all toggleable modules. Any authenticated user can read."""
    rows = db.query(AppSettings).filter(AppSettings.key.in_(MODULE_KEYS)).all()
    stored = {r.key: r.value for r in rows}

    result = {}
    for key in MODULE_KEYS:
        name = key.split(".", 1)[1]  # e.g. "photos"
        result[name] = (stored.get(key, MODULE_DEFAULTS[key])) == "true"
    return result


@router.put("/settings/modules")
def update_module_settings(
    modules: dict,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Update module enabled/disabled state. Admin only."""
    for name, enabled in modules.items():
        key = f"modules.{name}"
        if key not in MODULE_KEYS:
            continue
        value = "true" if enabled else "false"
        existing = db.query(AppSettings).filter(AppSettings.key == key).first()
        if existing:
            existing.value = value
        else:
            db.add(AppSettings(key=key, value=value))

    db.commit()

    # Return updated state
    return get_module_settings(current_user=admin, db=db)


# ============================================================================
# General Settings (currency, etc.)
# ============================================================================

GENERAL_SETTINGS_DEFAULTS = {
    "default_currency": "EUR",
    "banner_theme": "reef",
    "banner_image": "",
    "unit_system": "metric",          # metric | us_imperial | uk_imperial
    "temperature_unit": "celsius",    # celsius | fahrenheit
    "country": "",                    # ISO 3166-1 alpha-2 (empty = not configured)
    "date_format": "DD/MM/YYYY",     # DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD
}


@router.get("/settings/general")
def get_general_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get general application settings. Any authenticated user can read."""
    keys = list(GENERAL_SETTINGS_DEFAULTS.keys())
    rows = db.query(AppSettings).filter(AppSettings.key.in_(keys)).all()
    stored = {r.key: r.value for r in rows}

    result = {}
    for key, default in GENERAL_SETTINGS_DEFAULTS.items():
        result[key] = stored.get(key, default)
    return result


@router.put("/settings/general")
def update_general_settings(
    settings: dict,
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Update general application settings. Admin only."""
    for key, value in settings.items():
        if key not in GENERAL_SETTINGS_DEFAULTS:
            continue
        existing = db.query(AppSettings).filter(AppSettings.key == key).first()
        if existing:
            existing.value = str(value)
        else:
            db.add(AppSettings(key=key, value=str(value)))

    db.commit()
    return get_general_settings(current_user=admin, db=db)


@router.post("/settings/banner-image")
async def upload_banner_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Upload a custom banner image. Admin only."""
    from uuid import uuid4

    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not allowed")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

    upload_dir = Path("/app/uploads/banners")
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"banner-{uuid4()}{file_ext}"
    file_path = upload_dir / unique_filename
    with open(file_path, "wb") as f:
        f.write(content)

    # Store path in settings
    image_url = f"/uploads/banners/{unique_filename}"
    existing = db.query(AppSettings).filter(AppSettings.key == "banner_image").first()
    if existing:
        # Delete old file if it exists
        old_path = Path("/app") / existing.value.lstrip("/")
        if old_path.exists():
            old_path.unlink(missing_ok=True)
        existing.value = image_url
    else:
        db.add(AppSettings(key="banner_image", value=image_url))

    # Also set theme to custom
    theme_row = db.query(AppSettings).filter(AppSettings.key == "banner_theme").first()
    if theme_row:
        theme_row.value = "custom"
    else:
        db.add(AppSettings(key="banner_theme", value="custom"))

    db.commit()
    return {"banner_image": image_url, "banner_theme": "custom"}


@router.get("/settings/banner-image")
def get_banner_image(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serve the custom banner image."""
    row = db.query(AppSettings).filter(AppSettings.key == "banner_image").first()
    if not row or not row.value:
        raise HTTPException(status_code=404, detail="No custom banner image")

    file_path = Path("/app") / row.value.lstrip("/")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Banner image file not found")

    return FileResponse(file_path)
