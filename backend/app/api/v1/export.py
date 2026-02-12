"""
CSV Export API Endpoints

Provides CSV file downloads for parameter readings, livestock, and maintenance data.

Each endpoint:
- Requires authentication via JWT
- Verifies tank ownership when tank_id is provided
- Returns a StreamingResponse with text/csv content type
- Includes Content-Disposition: attachment header for browser download
"""
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.models.livestock import Livestock
from app.models.maintenance import MaintenanceReminder
from app.api.deps import get_current_user
from app.services.influxdb import influxdb_service

router = APIRouter()


def _verify_tank_ownership(tank_id: str, user: User, db: Session) -> Tank:
    """Verify that the given tank belongs to the current user."""
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == user.id
    ).first()
    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found or access denied"
        )
    return tank


def _csv_streaming_response(output: io.StringIO, filename: str) -> StreamingResponse:
    """Build a StreamingResponse for a CSV file download."""
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/parameters")
async def export_parameters_csv(
    tank_id: str = Query(None, description="Filter by tank ID"),
    start: str = Query("-30d", description="Start time (e.g. -30d, -7d, 2024-01-01T00:00:00Z)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export parameter readings as a CSV file.

    Columns: timestamp, tank_id, parameter_type, value
    """
    if tank_id:
        _verify_tank_ownership(tank_id, current_user, db)

    try:
        results = influxdb_service.query_parameters(
            user_id=str(current_user.id),
            tank_id=tank_id,
            start=start,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query parameters: {str(e)}"
        )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "tank_id", "parameter_type", "value"])

    for record in results:
        writer.writerow([
            record.get("time", ""),
            record.get("tank_id", ""),
            record.get("parameter_type", ""),
            record.get("value", ""),
        ])

    return _csv_streaming_response(output, "parameters.csv")


@router.get("/livestock")
async def export_livestock_csv(
    tank_id: str = Query(None, description="Filter by tank ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export livestock list as a CSV file.

    Columns: name, species, quantity, date_acquired, price, status, notes
    """
    query = db.query(Livestock).filter(Livestock.user_id == current_user.id)

    if tank_id:
        _verify_tank_ownership(tank_id, current_user, db)
        query = query.filter(Livestock.tank_id == tank_id)

    livestock_items = query.order_by(Livestock.added_date.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "species", "quantity", "date_acquired", "price", "status", "notes"])

    for item in livestock_items:
        writer.writerow([
            item.common_name or "",
            item.species_name or "",
            item.quantity or 1,
            str(item.added_date) if item.added_date else "",
            item.purchase_price or "",
            item.status or "alive",
            item.notes or "",
        ])

    return _csv_streaming_response(output, "livestock.csv")


@router.get("/maintenance")
async def export_maintenance_csv(
    tank_id: str = Query(None, description="Filter by tank ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export maintenance reminders as a CSV file.

    Columns: title, description, frequency_days, next_due, last_completed, is_active, reminder_type
    """
    query = db.query(MaintenanceReminder).filter(
        MaintenanceReminder.user_id == current_user.id
    )

    if tank_id:
        _verify_tank_ownership(tank_id, current_user, db)
        query = query.filter(MaintenanceReminder.tank_id == tank_id)

    reminders = query.order_by(MaintenanceReminder.next_due).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["title", "description", "frequency_days", "next_due", "last_completed", "is_active", "reminder_type"])

    for reminder in reminders:
        writer.writerow([
            reminder.title or "",
            reminder.description or "",
            reminder.frequency_days,
            str(reminder.next_due) if reminder.next_due else "",
            str(reminder.last_completed) if reminder.last_completed else "",
            reminder.is_active,
            reminder.reminder_type or "",
        ])

    return _csv_streaming_response(output, "maintenance.csv")
