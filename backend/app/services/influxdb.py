"""
InfluxDB Service

Manages time-series data for reef parameters in InfluxDB2.

Why InfluxDB for parameter data?
================================
1. Purpose-built for time-series data (water tests are time-series)
2. Efficient storage and queries for temporal data
3. Native Grafana integration for visualization
4. Automatic downsampling and retention policies
5. Tags allow multi-dimensional queries (user, tank, parameter type)

Data Model:
===========
Measurement: reef_parameters
Tags:
  - user_id: UUID of the user (for multi-tenancy)
  - tank_id: UUID of the tank
  - parameter_type: calcium, magnesium, alkalinity_kh, nitrate, phosphate, salinity, temperature, ph
Fields:
  - value: float (the measured value)

Timestamp: Automatically added by InfluxDB (or provided)

Example Data Point:
-------------------
reef_parameters,user_id=abc-123,tank_id=def-456,parameter_type=calcium value=420.0 1640995200000000000

Why this structure?
-------------------
- Tags are indexed: Fast filtering by user, tank, or parameter
- Single value field: Simplifies queries and aggregations
- Separate parameter_type tag: Allows querying specific or all parameters
- User/tank tags: Essential for multi-tenancy and isolation

Grafana Integration:
====================
Users can create dashboards querying:
- All parameters for a tank over time
- Compare parameters across tanks
- Identify trends and anomalies
- Set alerts for out-of-range values
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

from app.core.config import settings


class InfluxDBService:
    """Service for interacting with InfluxDB2"""

    def __init__(self):
        """
        Initialize InfluxDB client with configuration from settings.

        Connection is lazy - client connects on first use.
        """
        self.client = InfluxDBClient(
            url=settings.INFLUXDB_URL,
            token=settings.INFLUXDB_TOKEN,
            org=settings.INFLUXDB_ORG
        )
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.client.query_api()
        self.bucket = settings.INFLUXDB_BUCKET

    def write_parameter(
        self,
        user_id: str,
        tank_id: str,
        parameter_type: str,
        value: float,
        timestamp: Optional[datetime] = None
    ) -> bool:
        """
        Write a single parameter measurement to InfluxDB.

        Args:
            user_id: UUID of the user (for multi-tenancy isolation)
            tank_id: UUID of the tank
            parameter_type: Type of parameter (calcium, magnesium, alkalinity_kh, etc.)
            value: The measured value
            timestamp: When the measurement was taken (defaults to now)

        Returns:
            True if write successful

        Raises:
            Exception: If write fails (network error, invalid data, etc.)
        """
        point = Point("reef_parameters") \
            .tag("user_id", str(user_id)) \
            .tag("tank_id", str(tank_id)) \
            .tag("parameter_type", parameter_type) \
            .field("value", float(value))

        if timestamp:
            point = point.time(timestamp)

        try:
            self.write_api.write(bucket=self.bucket, record=point)
            return True
        except Exception as e:
            # Log error and re-raise
            print(f"Error writing to InfluxDB: {e}")
            raise

    def write_parameters_batch(
        self,
        user_id: str,
        tank_id: str,
        parameters: Dict[str, float],
        timestamp: Optional[datetime] = None
    ) -> bool:
        """
        Write multiple parameters at once (e.g., full water test results).

        This is more efficient than individual writes when submitting
        complete test results (Ca, Mg, KH, NO3, PO4, etc. all at once).

        Args:
            user_id: UUID of the user
            tank_id: UUID of the tank
            parameters: Dict mapping parameter_type to value
                       e.g., {"calcium": 420.0, "alkalinity_kh": 8.5}
            timestamp: When measurements were taken (defaults to now)

        Returns:
            True if all writes successful

        Example:
            >>> service.write_parameters_batch(
            ...     user_id="abc-123",
            ...     tank_id="def-456",
            ...     parameters={
            ...         "calcium": 420.0,
            ...         "magnesium": 1350.0,
            ...         "alkalinity_kh": 8.5,
            ...         "nitrate": 5.0,
            ...         "phosphate": 0.05
            ...     }
            ... )
        """
        points = []
        for param_type, value in parameters.items():
            point = Point("reef_parameters") \
                .tag("user_id", str(user_id)) \
                .tag("tank_id", str(tank_id)) \
                .tag("parameter_type", param_type) \
                .field("value", float(value))

            if timestamp:
                point = point.time(timestamp)

            points.append(point)

        try:
            self.write_api.write(bucket=self.bucket, record=points)
            return True
        except Exception as e:
            print(f"Error writing batch to InfluxDB: {e}")
            raise

    def query_parameters(
        self,
        user_id: str,
        tank_id: Optional[str] = None,
        parameter_type: Optional[str] = None,
        start: str = "-30d",
        stop: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Query parameter history from InfluxDB.

        Args:
            user_id: UUID of the user (required for multi-tenancy)
            tank_id: Optional filter by tank
            parameter_type: Optional filter by parameter type
            start: Time range start (default: last 30 days)
                   Formats: "-30d", "-1h", "2024-01-01T00:00:00Z"
            stop: Time range end (default: now)

        Returns:
            List of dicts with keys: time, user_id, tank_id, parameter_type, value

        Example Query:
            >>> # Get all calcium readings for the last 7 days
            >>> service.query_parameters(
            ...     user_id="abc-123",
            ...     tank_id="def-456",
            ...     parameter_type="calcium",
            ...     start="-7d"
            ... )
        """
        # Build Flux query
        query = f'''
        from(bucket: "{self.bucket}")
            |> range(start: {start}{f", stop: {stop}" if stop else ""})
            |> filter(fn: (r) => r["_measurement"] == "reef_parameters")
            |> filter(fn: (r) => r["user_id"] == "{user_id}")
        '''

        if tank_id:
            query += f'''
            |> filter(fn: (r) => r["tank_id"] == "{tank_id}")
            '''

        if parameter_type:
            query += f'''
            |> filter(fn: (r) => r["parameter_type"] == "{parameter_type}")
            '''

        query += '''
            |> filter(fn: (r) => r["_field"] == "value")
        '''

        try:
            result = self.query_api.query(query=query)
            records = []

            for table in result:
                for record in table.records:
                    records.append({
                        "time": record.get_time(),
                        "user_id": record.values.get("user_id"),
                        "tank_id": record.values.get("tank_id"),
                        "parameter_type": record.values.get("parameter_type"),
                        "value": record.get_value()
                    })

            return records
        except Exception as e:
            print(f"Error querying InfluxDB: {e}")
            raise

    def delete_parameter(
        self,
        user_id: str,
        tank_id: str,
        parameter_type: str,
        timestamp: datetime
    ) -> bool:
        """
        Delete a specific parameter reading from InfluxDB.

        Args:
            user_id: UUID of the user
            tank_id: UUID of the tank
            parameter_type: Type of parameter to delete
            timestamp: Exact timestamp of the reading to delete

        Returns:
            True if delete successful

        Example:
            >>> service.delete_parameter(
            ...     user_id="abc-123",
            ...     tank_id="def-456",
            ...     parameter_type="calcium",
            ...     timestamp=datetime(2025, 3, 6, 10, 30)
            ... )
        """
        delete_api = self.client.delete_api()

        # Convert timestamp to RFC3339 format (without fractional seconds)
        # InfluxDB requires RFC3339Nano format like "2026-02-07T16:07:00Z"
        start_time = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        # Add 1 second to create a narrow time range for deletion
        stop_time = (timestamp + timedelta(seconds=1)).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Build predicate to target specific data point
        predicate = f'_measurement="reef_parameters" AND user_id="{user_id}" AND tank_id="{tank_id}" AND parameter_type="{parameter_type}"'

        try:
            delete_api.delete(
                start=start_time,
                stop=stop_time,
                predicate=predicate,
                bucket=self.bucket,
                org=settings.INFLUXDB_ORG
            )
            return True
        except Exception as e:
            print(f"Error deleting from InfluxDB: {e}")
            raise

    def export_user_parameters(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Export ALL parameter readings for a user (no time limit).

        Used by admin export to include complete InfluxDB history.

        Args:
            user_id: UUID of the user

        Returns:
            List of dicts with keys: time, tank_id, parameter_type, value
        """
        query = f'''
        from(bucket: "{self.bucket}")
            |> range(start: 0)
            |> filter(fn: (r) => r["_measurement"] == "reef_parameters")
            |> filter(fn: (r) => r["user_id"] == "{user_id}")
            |> filter(fn: (r) => r["_field"] == "value")
        '''

        try:
            result = self.query_api.query(query=query)
            records = []
            for table in result:
                for record in table.records:
                    records.append({
                        "time": record.get_time().isoformat(),
                        "tank_id": record.values.get("tank_id"),
                        "parameter_type": record.values.get("parameter_type"),
                        "value": record.get_value()
                    })
            return records
        except Exception as e:
            print(f"Error exporting user parameters from InfluxDB: {e}")
            return []

    def export_tank_parameters(self, user_id: str, tank_id: str) -> List[Dict[str, Any]]:
        """
        Export ALL parameter readings for a specific tank (no time limit).

        Args:
            user_id: UUID of the user
            tank_id: UUID of the tank

        Returns:
            List of dicts with keys: time, parameter_type, value
        """
        query = f'''
        from(bucket: "{self.bucket}")
            |> range(start: 0)
            |> filter(fn: (r) => r["_measurement"] == "reef_parameters")
            |> filter(fn: (r) => r["user_id"] == "{user_id}")
            |> filter(fn: (r) => r["tank_id"] == "{tank_id}")
            |> filter(fn: (r) => r["_field"] == "value")
        '''

        try:
            result = self.query_api.query(query=query)
            records = []
            for table in result:
                for record in table.records:
                    records.append({
                        "time": record.get_time().isoformat(),
                        "parameter_type": record.values.get("parameter_type"),
                        "value": record.get_value()
                    })
            return records
        except Exception as e:
            print(f"Error exporting tank parameters from InfluxDB: {e}")
            return []

    def close(self):
        """Close InfluxDB client connection"""
        self.client.close()


# Singleton instance
influxdb_service = InfluxDBService()
