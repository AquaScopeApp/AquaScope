"""
Parameter API Endpoints

Handles water parameter submissions and queries via InfluxDB.

Key Features:
- Batch submission (submit full test at once)
- Flexible querying (by tank, parameter type, time range)
- Multi-tenant isolation (user_id tagged in InfluxDB)
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.tank import Tank
from app.schemas.parameter import ParameterSubmission, ParameterQuery, ParameterResponse
from app.api.deps import get_current_user
from app.services.influxdb import influxdb_service

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_parameters(
    submission: ParameterSubmission,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit water parameter test results.

    Process:
    1. Verify tank belongs to current user
    2. Extract non-null parameters
    3. Write to InfluxDB with user_id and tank_id tags
    4. Return success confirmation

    Example Request:
    ```json
    {
      "tank_id": "abc-123-def-456",
      "timestamp": "2024-01-15T10:30:00Z",
      "calcium": 420.0,
      "magnesium": 1350.0,
      "alkalinity_kh": 8.5,
      "nitrate": 5.0,
      "phosphate": 0.05,
      "salinity": 1.025,
      "temperature": 25.5,
      "ph": 8.2
    }
    ```

    Note: Only provide parameters that were actually tested.
    """
    # Verify tank ownership
    tank = db.query(Tank).filter(
        Tank.id == submission.tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found or access denied"
        )

    # Extract non-null parameters
    parameters = {}
    param_fields = [
        "calcium", "magnesium", "alkalinity_kh", "nitrate",
        "phosphate", "salinity", "temperature", "ph",
        "gh", "ammonia", "nitrite"
    ]

    for field in param_fields:
        value = getattr(submission, field)
        if value is not None:
            parameters[field] = value

    if not parameters:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one parameter must be provided"
        )

    # Write to InfluxDB
    try:
        influxdb_service.write_parameters_batch(
            user_id=str(current_user.id),
            tank_id=str(submission.tank_id),
            parameters=parameters,
            timestamp=submission.timestamp
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write parameters: {str(e)}"
        )

    return {
        "message": "Parameters submitted successfully",
        "count": len(parameters),
        "parameters": list(parameters.keys())
    }


@router.get("/", response_model=List[ParameterResponse])
async def query_parameters(
    tank_id: str = None,
    parameter_type: str = None,
    start: str = "-30d",
    stop: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Query parameter history from InfluxDB.

    Query Parameters:
    - tank_id: Filter by specific tank (optional)
    - parameter_type: Filter by parameter (calcium, magnesium, etc.)
    - start: Start time (default: -30d) - InfluxDB format
    - stop: End time (default: now)

    Time Formats:
    - Relative: "-30d", "-7d", "-1h"
    - Absolute: "2024-01-01T00:00:00Z"

    Example:
    ```
    GET /parameters?tank_id=abc-123&parameter_type=calcium&start=-7d
    ```

    Returns chronological list of measurements.
    """
    # If tank_id provided, verify ownership
    if tank_id:
        tank = db.query(Tank).filter(
            Tank.id == tank_id,
            Tank.user_id == current_user.id
        ).first()

        if not tank:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tank not found or access denied"
            )

    # Query InfluxDB
    try:
        results = influxdb_service.query_parameters(
            user_id=str(current_user.id),
            tank_id=tank_id,
            parameter_type=parameter_type,
            start=start,
            stop=stop
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query parameters: {str(e)}"
        )

    # Convert to response model
    return [
        ParameterResponse(
            time=record["time"],
            tank_id=record["tank_id"],
            parameter_type=record["parameter_type"],
            value=record["value"]
        )
        for record in results
    ]


@router.get("/latest")
async def get_latest_parameters(
    tank_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the latest reading for each parameter type.

    Useful for displaying current tank status.

    Example Response:
    ```json
    {
      "calcium": {"value": 420.0, "time": "2024-01-15T10:30:00Z"},
      "alkalinity_kh": {"value": 8.5, "time": "2024-01-15T10:30:00Z"}
    }
    ```
    """
    # Verify tank ownership
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found or access denied"
        )

    # Query last 24 hours and group by parameter_type
    try:
        results = influxdb_service.query_parameters(
            user_id=str(current_user.id),
            tank_id=tank_id,
            start="-24h"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query parameters: {str(e)}"
        )

    # Get latest value for each parameter type
    latest = {}
    for record in results:
        param_type = record["parameter_type"]
        if param_type not in latest or record["time"] > latest[param_type]["time"]:
            latest[param_type] = {
                "value": record["value"],
                "time": record["time"]
            }

    return latest


@router.delete("/")
async def delete_parameter(
    tank_id: str,
    parameter_type: str,
    timestamp: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a specific parameter reading from InfluxDB.

    Query Parameters:
    - tank_id: Tank UUID
    - parameter_type: Parameter type (calcium, magnesium, etc.)
    - timestamp: ISO format timestamp of the reading to delete

    Example:
    ```
    DELETE /parameters?tank_id=abc-123&parameter_type=calcium&timestamp=2025-03-06T10:30:00Z
    ```

    Returns confirmation of deletion.
    """
    # Verify tank ownership
    tank = db.query(Tank).filter(
        Tank.id == tank_id,
        Tank.user_id == current_user.id
    ).first()

    if not tank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tank not found or access denied"
        )

    # Parse timestamp
    try:
        ts = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid timestamp format. Use ISO format (e.g., 2025-03-06T10:30:00Z)"
        )

    # Delete from InfluxDB
    try:
        influxdb_service.delete_parameter(
            user_id=str(current_user.id),
            tank_id=str(tank_id),
            parameter_type=parameter_type,
            timestamp=ts
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete parameter: {str(e)}"
        )

    return {
        "message": "Parameter deleted successfully",
        "tank_id": tank_id,
        "parameter_type": parameter_type,
        "timestamp": timestamp
    }
