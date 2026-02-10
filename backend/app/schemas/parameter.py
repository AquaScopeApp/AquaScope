"""
Parameter Schemas

Pydantic models for water parameter data submission and querying.

Standard ICP Parameters:
- calcium: 380-450 ppm
- magnesium: 1250-1400 ppm
- alkalinity_kh: 7-11 dKH
- nitrate: 0-20 ppm
- phosphate: 0.01-0.10 ppm
- salinity: 1.025-1.027 SG or 33-36 ppt
- temperature: 24-26°C (75-79°F)
- ph: 8.0-8.4
"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict


class ParameterSubmission(BaseModel):
    """
    Schema for submitting water test results.

    Users can submit multiple parameters at once (full ICP test)
    or individual parameters (spot checks).
    """
    tank_id: UUID
    timestamp: Optional[datetime] = None  # Defaults to now if not provided

    # All parameters are optional (submit only what was tested)
    calcium: Optional[float] = Field(None, ge=0, description="Calcium in ppm")
    magnesium: Optional[float] = Field(None, ge=0, description="Magnesium in ppm")
    alkalinity_kh: Optional[float] = Field(None, ge=0, description="Alkalinity in dKH")
    nitrate: Optional[float] = Field(None, ge=0, description="Nitrate in ppm")
    phosphate: Optional[float] = Field(None, ge=0, description="Phosphate in ppm")
    salinity: Optional[float] = Field(None, ge=0, description="Salinity in ppt or SG")
    temperature: Optional[float] = Field(None, ge=-10, le=50, description="Temperature in °C")
    ph: Optional[float] = Field(None, ge=0, le=14, description="pH level")
    # Freshwater parameters
    gh: Optional[float] = Field(None, ge=0, description="General Hardness in dGH")
    ammonia: Optional[float] = Field(None, ge=0, description="Ammonia (NH3/NH4) in ppm")
    nitrite: Optional[float] = Field(None, ge=0, description="Nitrite (NO2) in ppm")


class ParameterQuery(BaseModel):
    """
    Schema for querying parameter history.

    Allows flexible filtering by tank, parameter type, and time range.
    """
    tank_id: Optional[UUID] = None
    parameter_type: Optional[str] = None
    start: str = "-30d"  # InfluxDB time format
    stop: Optional[str] = None


class ParameterResponse(BaseModel):
    """
    Schema for parameter query results.
    """
    time: datetime
    tank_id: str
    parameter_type: str
    value: float
