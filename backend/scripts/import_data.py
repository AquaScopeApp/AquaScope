#!/usr/bin/env python3
"""
Import data from Excel file into ReefLab database

Usage:
    python scripts/import_data.py --file path/to/data.xlsx --email user@example.com
"""
import sys
import os
import argparse
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.tank import Tank
from app.core.security import get_password_hash
from app.services.influxdb import InfluxDBService


def create_test_user(db: Session, email: str, username: str, password: str) -> User:
    """Create a test user if they don't exist"""
    # Check if user already exists
    user = db.query(User).filter(User.email == email).first()
    if user:
        print(f"✓ User {email} already exists")
        return user

    # Create new user
    user = User(
        email=email,
        username=username,
        hashed_password=get_password_hash(password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"✓ Created user: {email}")
    return user


def create_tank(db: Session, user_id: str, name: str, volume_liters: float) -> Tank:
    """Create a tank if it doesn't exist"""
    # Check if tank already exists
    tank = db.query(Tank).filter(
        Tank.user_id == user_id,
        Tank.name == name
    ).first()

    if tank:
        print(f"✓ Tank '{name}' already exists")
        return tank

    # Create new tank
    tank = Tank(
        user_id=user_id,
        name=name,
        volume_liters=volume_liters,
        setup_date=datetime.utcnow().date()
    )
    db.add(tank)
    db.commit()
    db.refresh(tank)
    print(f"✓ Created tank: {name} ({volume_liters}L)")
    return tank


def parse_date(date_value):
    """Parse various date formats"""
    if pd.isna(date_value):
        return None

    if isinstance(date_value, datetime):
        return date_value

    if isinstance(date_value, str):
        # Try different date formats
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d']:
            try:
                return datetime.strptime(date_value, fmt)
            except ValueError:
                continue

    return None


def import_parameters(
    excel_file: str,
    user: User,
    tank: Tank,
    influxdb: InfluxDBService
):
    """Import parameters from Excel file"""
    print(f"\nReading Excel file: {excel_file}")

    try:
        df = pd.read_excel(excel_file)
    except Exception as e:
        print(f"✗ Error reading Excel file: {e}")
        return

    print(f"✓ Loaded {len(df)} rows")
    print(f"✓ Columns: {df.columns.tolist()}")

    # Map common column names to parameter types
    column_mapping = {
        'date': 'date',
        'datetime': 'date',
        'timestamp': 'date',
        'calcium': 'calcium',
        'ca': 'calcium',
        'magnesium': 'magnesium',
        'mg': 'magnesium',
        'alkalinity': 'alkalinity_kh',
        'alk': 'alkalinity_kh',
        'kh': 'alkalinity_kh',
        'nitrate': 'nitrate',
        'no3': 'nitrate',
        'phosphate': 'phosphate',
        'po4': 'phosphate',
        'salinity': 'salinity',
        'sal': 'salinity',
        'temperature': 'temperature',
        'temp': 'temperature',
        'ph': 'ph',
    }

    # Normalize column names
    df.columns = [col.lower().strip() for col in df.columns]

    # Find date column
    date_col = None
    for col in df.columns:
        if col in ['date', 'datetime', 'timestamp']:
            date_col = col
            break

    if date_col is None:
        print("✗ No date column found. Expected column named 'date', 'datetime', or 'timestamp'")
        return

    print(f"\nImporting parameters to InfluxDB...")
    imported_count = 0
    error_count = 0

    for idx, row in df.iterrows():
        try:
            # Parse date
            timestamp = parse_date(row[date_col])
            if timestamp is None:
                print(f"⚠ Row {idx + 1}: Could not parse date '{row[date_col]}'")
                error_count += 1
                continue

            # Import each parameter
            for col in df.columns:
                if col == date_col:
                    continue

                # Get parameter type
                param_type = column_mapping.get(col)
                if param_type is None:
                    continue

                # Get value
                value = row[col]
                if pd.isna(value):
                    continue

                try:
                    value = float(value)
                except (ValueError, TypeError):
                    continue

                # Write to InfluxDB
                influxdb.write_parameter(
                    user_id=str(user.id),
                    tank_id=str(tank.id),
                    parameter_type=param_type,
                    value=value,
                    timestamp=timestamp
                )
                imported_count += 1

        except Exception as e:
            print(f"⚠ Row {idx + 1}: Error - {e}")
            error_count += 1
            continue

    print(f"\n✓ Successfully imported {imported_count} parameter readings")
    if error_count > 0:
        print(f"⚠ {error_count} rows had errors")


def main():
    parser = argparse.ArgumentParser(description='Import reef data from Excel')
    parser.add_argument(
        '--file',
        required=True,
        help='Path to Excel file'
    )
    parser.add_argument(
        '--email',
        default='demo@reeflab.com',
        help='User email (default: demo@reeflab.com)'
    )
    parser.add_argument(
        '--username',
        default='Demo User',
        help='Username (default: Demo User)'
    )
    parser.add_argument(
        '--password',
        default='demo123456',
        help='Password (default: demo123456)'
    )
    parser.add_argument(
        '--tank-name',
        default='Main Display Tank',
        help='Tank name (default: Main Display Tank)'
    )
    parser.add_argument(
        '--tank-volume',
        type=float,
        default=500.0,
        help='Tank volume in liters (default: 500)'
    )

    args = parser.parse_args()

    # Check if file exists
    if not os.path.exists(args.file):
        print(f"✗ File not found: {args.file}")
        sys.exit(1)

    print("=" * 60)
    print("ReefLab Data Import")
    print("=" * 60)

    # Create database tables
    print("\n1. Setting up database...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables ready")

    # Create database session
    db = SessionLocal()

    try:
        # Create user
        print("\n2. Creating user...")
        user = create_test_user(
            db,
            email=args.email,
            username=args.username,
            password=args.password
        )

        # Create tank
        print("\n3. Creating tank...")
        tank = create_tank(
            db,
            user_id=str(user.id),
            name=args.tank_name,
            volume_liters=args.tank_volume
        )

        # Initialize InfluxDB service
        print("\n4. Connecting to InfluxDB...")
        try:
            influxdb = InfluxDBService()
            print("✓ Connected to InfluxDB")
        except Exception as e:
            print(f"✗ Could not connect to InfluxDB: {e}")
            print("  Make sure InfluxDB is running and configured correctly")
            sys.exit(1)

        # Import parameters
        print("\n5. Importing parameters...")
        import_parameters(args.file, user, tank, influxdb)

        print("\n" + "=" * 60)
        print("✓ Import complete!")
        print("=" * 60)
        print(f"\nLogin credentials:")
        print(f"  Email:    {args.email}")
        print(f"  Password: {args.password}")
        print(f"\nAccess the application at: http://localhost")

    except Exception as e:
        print(f"\n✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        db.close()


if __name__ == "__main__":
    main()
