"""
Integration tests for Dashboard API endpoint
"""
import pytest
from datetime import date, timedelta
from app.models.tank import Tank
from app.models.equipment import Equipment
from app.models.livestock import Livestock
from app.models.maintenance import MaintenanceReminder
from app.models.note import Note
from app.models.photo import Photo
from app.models.consumable import Consumable


@pytest.fixture
def test_tank(db_session, test_user):
    """Create a test tank"""
    tank = Tank(
        name="Test Reef Tank",
        display_volume_liters=200,
        sump_volume_liters=50,
        user_id=test_user.id
    )
    db_session.add(tank)
    db_session.commit()
    db_session.refresh(tank)
    return tank


@pytest.fixture
def second_tank(db_session, test_user):
    """Create a second test tank"""
    tank = Tank(
        name="Quarantine Tank",
        display_volume_liters=50,
        sump_volume_liters=0,
        user_id=test_user.id
    )
    db_session.add(tank)
    db_session.commit()
    db_session.refresh(tank)
    return tank


class TestDashboardSummary:
    """Tests for GET /api/v1/dashboard/summary"""

    def test_dashboard_unauthenticated(self, client):
        """Test that unauthenticated requests return 401"""
        response = client.get("/api/v1/dashboard/summary")
        assert response.status_code == 401

    def test_dashboard_empty(self, authenticated_client):
        """Test dashboard with no tanks returns empty list and zero overdue"""
        response = authenticated_client.get("/api/v1/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["tanks"] == []
        assert data["total_overdue"] == 0

    def test_dashboard_with_tanks(self, authenticated_client, test_tank, second_tank):
        """Test dashboard returns all user tanks with summary information"""
        response = authenticated_client.get("/api/v1/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert len(data["tanks"]) == 2

        tank_names = [t["tank_name"] for t in data["tanks"]]
        assert "Test Reef Tank" in tank_names
        assert "Quarantine Tank" in tank_names

        # Each tank summary should have zero counts when no entities exist
        for tank_summary in data["tanks"]:
            assert tank_summary["equipment_count"] == 0
            assert tank_summary["livestock_count"] == 0
            assert tank_summary["photos_count"] == 0
            assert tank_summary["notes_count"] == 0
            assert tank_summary["maintenance_count"] == 0
            assert tank_summary["consumables_count"] == 0
            assert tank_summary["overdue_count"] == 0

        assert data["total_overdue"] == 0

    def test_dashboard_with_equipment_livestock(
        self, authenticated_client, db_session, test_user, test_tank, second_tank
    ):
        """Test dashboard returns correct entity counts per tank"""
        # Add 2 equipment items to first tank
        for i in range(2):
            db_session.add(Equipment(
                tank_id=test_tank.id,
                user_id=test_user.id,
                name=f"Pump {i}",
                equipment_type="pump",
            ))

        # Add 3 livestock items to first tank
        for i in range(3):
            db_session.add(Livestock(
                tank_id=test_tank.id,
                user_id=test_user.id,
                species_name=f"Species {i}",
                common_name=f"Fish {i}",
                type="fish",
                added_date=date.today(),
            ))

        # Add 1 note to first tank
        db_session.add(Note(
            tank_id=test_tank.id,
            user_id=test_user.id,
            content="Test note",
        ))

        # Add 2 photos to first tank
        for i in range(2):
            db_session.add(Photo(
                tank_id=test_tank.id,
                user_id=test_user.id,
                filename=f"photo_{i}.jpg",
                file_path=f"/uploads/photo_{i}.jpg",
            ))

        # Add 1 maintenance reminder to first tank (not overdue)
        db_session.add(MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Water Change",
            reminder_type="water_change",
            frequency_days=7,
            next_due=date.today() + timedelta(days=3),
        ))

        # Add 1 consumable to first tank
        db_session.add(Consumable(
            tank_id=test_tank.id,
            user_id=test_user.id,
            name="Reef Salt",
            consumable_type="salt_mix",
            brand="Red Sea",
        ))

        # Add 1 livestock item to second tank
        db_session.add(Livestock(
            tank_id=second_tank.id,
            user_id=test_user.id,
            species_name="Amphiprion ocellaris",
            common_name="Clownfish",
            type="fish",
            added_date=date.today(),
        ))

        db_session.commit()

        response = authenticated_client.get("/api/v1/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert len(data["tanks"]) == 2

        # Find each tank summary by name
        summaries = {t["tank_name"]: t for t in data["tanks"]}

        reef = summaries["Test Reef Tank"]
        assert reef["equipment_count"] == 2
        assert reef["livestock_count"] == 3
        assert reef["photos_count"] == 2
        assert reef["notes_count"] == 1
        assert reef["maintenance_count"] == 1
        assert reef["consumables_count"] == 1
        assert reef["overdue_count"] == 0

        qt = summaries["Quarantine Tank"]
        assert qt["equipment_count"] == 0
        assert qt["livestock_count"] == 1
        assert qt["photos_count"] == 0
        assert qt["notes_count"] == 0
        assert qt["maintenance_count"] == 0
        assert qt["consumables_count"] == 0
        assert qt["overdue_count"] == 0

        assert data["total_overdue"] == 0

    def test_dashboard_overdue_count(
        self, authenticated_client, db_session, test_user, test_tank, second_tank
    ):
        """Test that overdue maintenance reminders are counted correctly"""
        # 2 overdue reminders on first tank
        db_session.add(MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Overdue Water Change",
            reminder_type="water_change",
            frequency_days=7,
            next_due=date.today() - timedelta(days=3),
            is_active=True,
        ))
        db_session.add(MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Overdue Pump Cleaning",
            reminder_type="pump_cleaning",
            frequency_days=30,
            next_due=date.today() - timedelta(days=1),
            is_active=True,
        ))

        # 1 overdue reminder on second tank
        db_session.add(MaintenanceReminder(
            tank_id=second_tank.id,
            user_id=test_user.id,
            title="Overdue Glass Cleaning",
            reminder_type="glass_cleaning",
            frequency_days=3,
            next_due=date.today() - timedelta(days=5),
            is_active=True,
        ))

        # 1 NOT overdue reminder on first tank (due in the future)
        db_session.add(MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Upcoming Filter Change",
            reminder_type="filter_media",
            frequency_days=30,
            next_due=date.today() + timedelta(days=10),
            is_active=True,
        ))

        # 1 overdue but INACTIVE reminder on first tank (should not count)
        db_session.add(MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Inactive Overdue Task",
            reminder_type="other",
            frequency_days=7,
            next_due=date.today() - timedelta(days=10),
            is_active=False,
        ))

        db_session.commit()

        response = authenticated_client.get("/api/v1/dashboard/summary")
        assert response.status_code == 200
        data = response.json()

        summaries = {t["tank_name"]: t for t in data["tanks"]}

        # First tank: 2 active overdue (inactive one excluded)
        assert summaries["Test Reef Tank"]["overdue_count"] == 2
        # Second tank: 1 active overdue
        assert summaries["Quarantine Tank"]["overdue_count"] == 1

        # Total overdue across all tanks
        assert data["total_overdue"] == 3
