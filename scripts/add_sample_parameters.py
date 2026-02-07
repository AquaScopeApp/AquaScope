#!/usr/bin/env python3
"""
Add Sample Parameter Data to InfluxDB

This script populates InfluxDB with realistic reef tank parameter data
for testing and demonstration purposes.

Usage:
    python scripts/add_sample_parameters.py <user_id> <tank_id>
"""

import sys
import os
from datetime import datetime, timedelta
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import random

# InfluxDB configuration
INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://localhost:8086")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_ADMIN_TOKEN", "reeflab-super-secret-token-change-in-production")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "reeflab")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "reef_parameters")


def generate_realistic_value(param_type, base_value, variation, trend=0):
    """Generate realistic parameter values with some variation and optional trend"""
    noise = random.gauss(0, variation)
    return base_value + noise + trend


def add_sample_data(user_id: str, tank_id: str, weeks: int = 12):
    """
    Add sample parameter data for the specified tank.

    Parameters:
    - user_id: User UUID
    - tank_id: Tank UUID
    - weeks: Number of weeks of historical data to generate
    """
    client = InfluxDBClient(url=INFLUXDB_URL, token=INFLUXDB_TOKEN, org=INFLUXDB_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)

    # Parameter configurations (base_value, variation, trend_per_week)
    parameters = {
        "calcium": (420, 10, -0.5),  # Slowly decreasing (consumption)
        "magnesium": (1350, 20, -1.0),
        "alkalinity_kh": (8.5, 0.3, -0.05),
        "nitrate": (5.0, 1.5, 0.1),  # Slowly increasing
        "phosphate": (0.03, 0.01, 0.001),
        "salinity": (35.0, 0.2, 0),  # Stable
        "temperature": (25.5, 0.3, 0),  # Stable
        "ph": (8.2, 0.1, 0)  # Stable
    }

    print(f"Adding {weeks} weeks of sample data for tank {tank_id}...")
    print(f"User ID: {user_id}")

    # Generate data points (2 per week = 104 data points for 12 weeks)
    start_date = datetime.utcnow() - timedelta(weeks=weeks)
    points_written = 0

    for week in range(weeks * 2):  # 2 measurements per week
        timestamp = start_date + timedelta(days=week * 3.5)  # Every 3.5 days

        for param_name, (base, variation, trend) in parameters.items():
            # Calculate value with trend
            trend_adjustment = trend * (week / 2)  # trend per week
            value = generate_realistic_value(param_name, base, variation, trend_adjustment)

            # Ensure values stay within realistic bounds
            if param_name == "calcium":
                value = max(380, min(480, value))
            elif param_name == "magnesium":
                value = max(1250, min(1450, value))
            elif param_name == "alkalinity_kh":
                value = max(7.0, min(10.0, value))
            elif param_name == "nitrate":
                value = max(0, min(20, value))
            elif param_name == "phosphate":
                value = max(0.01, min(0.10, value))
            elif param_name == "salinity":
                value = max(34.0, min(36.0, value))
            elif param_name == "temperature":
                value = max(24.0, min(27.0, value))
            elif param_name == "ph":
                value = max(7.8, min(8.5, value))

            # Create and write point
            point = (
                Point("reef_parameters")
                .tag("user_id", user_id)
                .tag("tank_id", tank_id)
                .tag("parameter_type", param_name)
                .field("value", round(value, 3))
                .time(timestamp)
            )

            write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
            points_written += 1

        # Progress indicator
        if (week + 1) % 10 == 0:
            print(f"Progress: {week + 1}/{weeks * 2} measurements written...")

    print(f"\n✅ Successfully added {points_written} data points!")
    print(f"   Parameters: {', '.join(parameters.keys())}")
    print(f"   Time range: {start_date.date()} to {datetime.utcnow().date()}")
    print(f"   Tank ID: {tank_id}")

    client.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python add_sample_parameters.py <user_id> <tank_id> [weeks]")
        print("\nExample:")
        print("  python add_sample_parameters.py \\")
        print("    12345678-1234-5678-1234-567812345678 \\")
        print("    87654321-8765-4321-8765-432187654321 \\")
        print("    12")
        sys.exit(1)

    user_id = sys.argv[1]
    tank_id = sys.argv[2]
    weeks = int(sys.argv[3]) if len(sys.argv) > 3 else 12

    try:
        add_sample_data(user_id, tank_id, weeks)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nMake sure:")
        print("1. InfluxDB is running (docker compose ps)")
        print("2. Environment variables are set correctly")
        print("3. User ID and Tank ID are valid UUIDs")
        sys.exit(1)
