#!/usr/bin/env python3
"""
Import Equipment Data from Journal Analysis

Based on Journal_Recifal.txt, this script adds equipment to the database.

Equipment found in journal:
- Bubble Magus Curve 7 Elite (protein skimmer) - replaced ARKA ACS180
- JEBAO UV Sterilizer 55W
- ReefBreeders Photon V2+ 32" (main light)
- ATO system (osmolateur)
- Return pumps (2x for redundancy)
- Circulation pumps (wavemakers)
- Dosing pump
- Air pump
"""
import sys
import os
from datetime import date

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal
from app.models.user import User
from app.models.tank import Tank
from app.models.equipment import Equipment


def get_first_user_and_tank(db):
    """Get the first user and their tank"""
    user = db.query(User).first()
    if not user:
        print("❌ No users found in database. Please create a user first.")
        return None, None

    tank = db.query(Tank).filter(Tank.user_id == user.id).first()
    if not tank:
        print(f"❌ No tank found for user {user.email}. Please create a tank first.")
        return None, None

    print(f"✅ Found user: {user.email}")
    print(f"✅ Found tank: {tank.name}")
    return user, tank


def import_equipment():
    """Import equipment from journal analysis"""
    db = SessionLocal()

    try:
        # Get user and tank
        user, tank = get_first_user_and_tank(db)
        if not user or not tank:
            return

        # Equipment data based on journal analysis
        equipment_list = [
            {
                "name": "Bubble Magus Curve 7 Elite",
                "equipment_type": "protein_skimmer",
                "manufacturer": "Bubble Magus",
                "model": "Curve 7 Elite",
                "condition": "excellent",
                "status": "active",
                "notes": "Replaced ARKA ACS180 skimmer which failed. Excellent performance.",
            },
            {
                "name": "ARKA ACS180",
                "equipment_type": "protein_skimmer",
                "manufacturer": "ARKA",
                "model": "ACS180",
                "condition": "failing",
                "status": "stock",
                "notes": "Original skimmer - failed and replaced by Bubble Magus Curve 7 Elite. Kept as backup.",
            },
            {
                "name": "UV Sterilizer JEBAO 55W",
                "equipment_type": "uv_sterilizer",
                "manufacturer": "JEBAO",
                "model": "55W",
                "condition": "excellent",
                "status": "active",
                "notes": "55W UV sterilizer for algae and pathogen control",
            },
            {
                "name": "ReefBreeders Photon V2+ 32\"",
                "equipment_type": "light",
                "manufacturer": "ReefBreeders",
                "model": "Photon V2+ 32\"",
                "condition": "excellent",
                "status": "active",
                "specs": {
                    "size": "32 inches",
                    "type": "LED",
                    "programmable": True,
                    "remote_control": True,
                },
                "notes": "Main reef light with programmable spectrum and intensity. Full remote control via included controller.",
            },
            {
                "name": "Osmolateur (ATO)",
                "equipment_type": "ato",
                "condition": "good",
                "status": "active",
                "notes": "Auto Top-Off system. Had a failure incident in January 2026 causing salinity spike. Monitor regularly.",
            },
            {
                "name": "Return Pump #1",
                "equipment_type": "return_pump",
                "condition": "good",
                "status": "active",
                "specs": {
                    "head_height": "1.5m",
                    "redundancy": "Primary pump with secondary backup",
                },
                "notes": "Primary return pump. Part of dual pump system for redundancy. Handles 1.5m head height from sump to display.",
            },
            {
                "name": "Return Pump #2",
                "equipment_type": "return_pump",
                "condition": "good",
                "status": "active",
                "specs": {
                    "head_height": "1.5m",
                    "redundancy": "Backup pump for primary",
                },
                "notes": "Secondary return pump for redundancy. Ensures continuous flow if primary fails.",
            },
            {
                "name": "Circulation Pump",
                "equipment_type": "wavemaker",
                "condition": "good",
                "status": "active",
                "notes": "Provides water circulation and flow in display tank. Regular cleaning required to prevent blockage.",
            },
            {
                "name": "Dosing Pump",
                "equipment_type": "doser",
                "condition": "excellent",
                "status": "active",
                "notes": "Automated dosing pump for KH buffer and trace elements. Calibrated for daily dosing schedule.",
            },
            {
                "name": "Air Pump",
                "equipment_type": "other",
                "condition": "excellent",
                "status": "active",
                "notes": "Added to enhance oxygenation. Particularly helpful during stress events. Corals visibly more open with air pump running.",
            },
        ]

        print(f"\n📦 Importing {len(equipment_list)} pieces of equipment...")
        print(f"👤 User: {user.email}")
        print(f"🐠 Tank: {tank.name}\n")

        added_count = 0
        skipped_count = 0

        for eq_data in equipment_list:
            # Check if equipment already exists
            existing = db.query(Equipment).filter(
                Equipment.tank_id == tank.id,
                Equipment.name == eq_data["name"]
            ).first()

            if existing:
                print(f"⏭️  Skipped: {eq_data['name']} (already exists)")
                skipped_count += 1
                continue

            # Create equipment
            equipment = Equipment(
                tank_id=tank.id,
                user_id=user.id,
                **eq_data
            )

            db.add(equipment)
            print(f"✅ Added: {eq_data['name']} ({eq_data['equipment_type']})")
            added_count += 1

        db.commit()

        print(f"\n{'='*60}")
        print(f"✅ Import complete!")
        print(f"   Added: {added_count}")
        print(f"   Skipped: {skipped_count}")
        print(f"   Total: {len(equipment_list)}")
        print(f"{'='*60}\n")

    except Exception as e:
        print(f"❌ Error importing equipment: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import_equipment()
