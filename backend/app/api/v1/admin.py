"""
Admin API Endpoints

Admin-only endpoints for user management and system monitoring.
"""
import os
from typing import List, Optional
from uuid import UUID
from pathlib import Path
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
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
from app.schemas.user import UserResponse, UserUpdate, UserWithStats, SystemStats
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

def _get_all_known_paths(db: Session) -> set:
    """Get all file paths referenced in the database."""
    known = set()

    # Photo file paths and thumbnails
    photos = db.query(Photo.file_path, Photo.thumbnail_path).all()
    for file_path, thumb_path in photos:
        if file_path:
            known.add(file_path)
        if thumb_path:
            known.add(thumb_path)

    # Tank image URLs
    tanks = db.query(Tank.image_url).filter(Tank.image_url.isnot(None)).all()
    for (image_url,) in tanks:
        if image_url:
            known.add(image_url)

    # ICP test PDFs
    icp_tests = db.query(ICPTest.pdf_path).filter(ICPTest.pdf_path.isnot(None)).all()
    for (pdf_path,) in icp_tests:
        if pdf_path:
            known.add(pdf_path)

    return known


def _categorize_file(rel_path: str) -> str:
    """Categorize a file based on its path."""
    if "tank-images" in rel_path:
        return "tank-images"
    if "icp_tests" in rel_path:
        return "icp-tests"
    if "thumb_" in rel_path:
        return "thumbnails"
    return "photos"


@router.get("/storage/stats")
def get_storage_stats(
    admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get storage usage statistics."""
    upload_dir = Path(settings.UPLOAD_DIR)
    if not upload_dir.exists():
        return {
            "total_size_bytes": 0,
            "total_files": 0,
            "categories": {},
            "per_user": [],
            "orphan_count": 0,
            "orphan_size_bytes": 0,
        }

    known_paths = _get_all_known_paths(db)
    categories: dict = {}
    per_user: dict = {}
    orphan_count = 0
    orphan_size_bytes = 0
    total_size = 0
    total_files = 0

    for root, _dirs, files in os.walk(upload_dir):
        for fname in files:
            full_path = Path(root) / fname
            rel_path = "/" + str(full_path.relative_to(upload_dir.parent.parent))
            size = full_path.stat().st_size
            total_size += size
            total_files += 1

            category = _categorize_file(str(full_path.relative_to(upload_dir)))
            if category not in categories:
                categories[category] = {"count": 0, "size_bytes": 0}
            categories[category]["count"] += 1
            categories[category]["size_bytes"] += size

            # Determine user
            try:
                rel_to_uploads = full_path.relative_to(upload_dir)
                parts = rel_to_uploads.parts
                if parts and parts[0] not in ("tank-images", "icp_tests"):
                    user_id = parts[0]
                    if user_id not in per_user:
                        user = db.query(User).filter(User.id == user_id).first()
                        per_user[user_id] = {
                            "user_id": user_id,
                            "email": user.email if user else "unknown",
                            "count": 0,
                            "size_bytes": 0,
                        }
                    per_user[user_id]["count"] += 1
                    per_user[user_id]["size_bytes"] += size
            except (ValueError, IndexError):
                pass

            # Check orphan status
            is_known = any(
                rel_path.endswith(p.lstrip("/")) or p.lstrip("/") in str(full_path)
                for p in known_paths
            )
            if not is_known:
                orphan_count += 1
                orphan_size_bytes += size

    return {
        "total_size_bytes": total_size,
        "total_files": total_files,
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
    """Browse uploaded files with optional filters."""
    upload_dir = Path(settings.UPLOAD_DIR)
    if not upload_dir.exists():
        return []

    known_paths = _get_all_known_paths(db)
    files = []

    for root, _dirs, filenames in os.walk(upload_dir):
        for fname in filenames:
            full_path = Path(root) / fname
            rel_to_uploads = str(full_path.relative_to(upload_dir))
            file_category = _categorize_file(rel_to_uploads)

            # Apply category filter
            if category and file_category != category:
                continue

            # Apply user_id filter
            parts = Path(rel_to_uploads).parts
            file_user_id = None
            if parts and parts[0] not in ("tank-images", "icp_tests"):
                file_user_id = parts[0]
            if user_id and file_user_id != user_id:
                continue

            stat = full_path.stat()
            rel_path = "/" + str(full_path.relative_to(upload_dir.parent.parent))

            is_known = any(
                rel_path.endswith(p.lstrip("/")) or p.lstrip("/") in str(full_path)
                for p in known_paths
            )

            # Look up owner
            owner_email = None
            if file_user_id:
                user = db.query(User).filter(User.id == file_user_id).first()
                owner_email = user.email if user else None

            # Look up linked tank
            tank_name = None
            if file_category == "tank-images":
                tank = db.query(Tank).filter(Tank.image_url.contains(fname)).first()
                if tank:
                    tank_name = tank.name
            elif file_user_id and len(parts) >= 2:
                tank_id = parts[1] if parts[1] != fname else None
                if tank_id:
                    tank = db.query(Tank).filter(Tank.id == tank_id).first()
                    if tank:
                        tank_name = tank.name

            files.append({
                "name": fname,
                "path": rel_to_uploads,
                "size_bytes": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "category": file_category,
                "user_id": file_user_id,
                "owner_email": owner_email,
                "tank_name": tank_name,
                "is_orphan": not is_known,
            })

    files.sort(key=lambda f: f["modified"], reverse=True)
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

    known_paths = _get_all_known_paths(db)
    deleted = 0
    freed_bytes = 0

    for root, _dirs, filenames in os.walk(upload_dir):
        for fname in filenames:
            full_path = Path(root) / fname
            rel_path = "/" + str(full_path.relative_to(upload_dir.parent.parent))

            is_known = any(
                rel_path.endswith(p.lstrip("/")) or p.lstrip("/") in str(full_path)
                for p in known_paths
            )

            if not is_known:
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
