"""
Integration tests for Maintenance Reminder endpoints
"""
import pytest
from datetime import date, timedelta
from app.models.tank import Tank
from app.models.maintenance import MaintenanceReminder


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
def test_reminder(db_session, test_user, test_tank):
    """Create a test reminder"""
    reminder = MaintenanceReminder(
        tank_id=test_tank.id,
        user_id=test_user.id,
        title="Weekly Water Change",
        description="Change 10% of water",
        reminder_type="water_change",
        frequency_days=7,
        next_due=date.today() + timedelta(days=3)
    )
    db_session.add(reminder)
    db_session.commit()
    db_session.refresh(reminder)
    return reminder


class TestCreateReminder:
    """Tests for creating maintenance reminders"""

    def test_create_reminder_success(self, authenticated_client, test_tank):
        """Test successful reminder creation"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": str(test_tank.id),
                "title": "Pump Cleaning",
                "description": "Clean return pump",
                "reminder_type": "pump_cleaning",
                "frequency_days": 30,
                "next_due": str(date.today() + timedelta(days=30))
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Pump Cleaning"
        assert data["reminder_type"] == "pump_cleaning"
        assert data["frequency_days"] == 30
        assert data["is_active"] is True

    def test_create_reminder_invalid_tank(self, authenticated_client):
        """Test reminder creation with non-existent tank"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": "00000000-0000-0000-0000-000000000000",
                "title": "Test",
                "reminder_type": "water_change",
                "frequency_days": 7,
                "next_due": str(date.today())
            }
        )
        assert response.status_code == 404

    def test_create_reminder_missing_fields(self, authenticated_client, test_tank):
        """Test reminder creation with missing required fields"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": str(test_tank.id),
                "title": "Test"
                # Missing required fields
            }
        )
        assert response.status_code == 422

    def test_create_reminder_unauthorized(self, client, test_tank):
        """Test reminder creation without authentication"""
        response = client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": str(test_tank.id),
                "title": "Test",
                "reminder_type": "water_change",
                "frequency_days": 7,
                "next_due": str(date.today())
            }
        )
        assert response.status_code == 401


class TestListReminders:
    """Tests for listing maintenance reminders"""

    def test_list_all_reminders(self, authenticated_client, test_reminder):
        """Test listing all reminders"""
        response = authenticated_client.get("/api/v1/maintenance/reminders")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(r["id"] == str(test_reminder.id) for r in data)

    def test_list_reminders_by_tank(self, authenticated_client, test_tank, test_reminder):
        """Test filtering reminders by tank"""
        response = authenticated_client.get(
            f"/api/v1/maintenance/reminders?tank_id={test_tank.id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert all(r["tank_id"] == str(test_tank.id) for r in data)

    def test_list_active_only(self, authenticated_client, db_session, test_user, test_tank):
        """Test filtering for active reminders only"""
        # Create inactive reminder
        inactive = MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Inactive Test",
            reminder_type="other",
            frequency_days=7,
            next_due=date.today(),
            is_active=False
        )
        db_session.add(inactive)
        db_session.commit()

        response = authenticated_client.get(
            "/api/v1/maintenance/reminders?active_only=true"
        )
        assert response.status_code == 200
        data = response.json()
        assert all(r["is_active"] for r in data)

    def test_list_overdue_only(self, authenticated_client, db_session, test_user, test_tank):
        """Test filtering for overdue reminders only"""
        # Create overdue reminder
        overdue = MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Overdue Test",
            reminder_type="water_change",
            frequency_days=7,
            next_due=date.today() - timedelta(days=3)
        )
        db_session.add(overdue)
        db_session.commit()

        response = authenticated_client.get(
            "/api/v1/maintenance/reminders?overdue_only=true"
        )
        assert response.status_code == 200
        data = response.json()
        assert all(date.fromisoformat(r["next_due"]) < date.today() for r in data)


class TestGetReminder:
    """Tests for getting a specific reminder"""

    def test_get_reminder_success(self, authenticated_client, test_reminder):
        """Test successful reminder retrieval"""
        response = authenticated_client.get(
            f"/api/v1/maintenance/reminders/{test_reminder.id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_reminder.id)
        assert data["title"] == test_reminder.title

    def test_get_reminder_not_found(self, authenticated_client):
        """Test getting non-existent reminder"""
        response = authenticated_client.get(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


class TestUpdateReminder:
    """Tests for updating reminders"""

    def test_update_reminder_success(self, authenticated_client, test_reminder):
        """Test successful reminder update"""
        response = authenticated_client.put(
            f"/api/v1/maintenance/reminders/{test_reminder.id}",
            json={
                "title": "Updated Title",
                "frequency_days": 14
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["frequency_days"] == 14

    def test_update_reminder_deactivate(self, authenticated_client, test_reminder):
        """Test deactivating a reminder"""
        response = authenticated_client.put(
            f"/api/v1/maintenance/reminders/{test_reminder.id}",
            json={"is_active": False}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

    def test_update_reminder_not_found(self, authenticated_client):
        """Test updating non-existent reminder"""
        response = authenticated_client.put(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000",
            json={"title": "Test"}
        )
        assert response.status_code == 404


class TestCompleteReminder:
    """Tests for marking reminders as complete"""

    def test_complete_reminder_success(self, authenticated_client, test_reminder):
        """Test successful reminder completion"""
        original_due = date.fromisoformat(test_reminder.next_due)
        response = authenticated_client.post(
            f"/api/v1/maintenance/reminders/{test_reminder.id}/complete",
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["last_completed"] is not None
        new_due = date.fromisoformat(data["next_due"])
        assert new_due == original_due + timedelta(days=test_reminder.frequency_days)

    def test_complete_reminder_custom_date(self, authenticated_client, test_reminder):
        """Test completing reminder with custom completion date"""
        custom_date = date.today() - timedelta(days=2)
        response = authenticated_client.post(
            f"/api/v1/maintenance/reminders/{test_reminder.id}/complete",
            json={"completed_date": str(custom_date)}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["last_completed"] == str(custom_date)
        expected_next = custom_date + timedelta(days=test_reminder.frequency_days)
        assert data["next_due"] == str(expected_next)

    def test_complete_reminder_not_found(self, authenticated_client):
        """Test completing non-existent reminder"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000/complete",
            json={}
        )
        assert response.status_code == 404


class TestDeleteReminder:
    """Tests for deleting reminders"""

    def test_delete_reminder_success(self, authenticated_client, test_reminder):
        """Test successful reminder deletion"""
        reminder_id = test_reminder.id
        response = authenticated_client.delete(
            f"/api/v1/maintenance/reminders/{reminder_id}"
        )
        assert response.status_code == 204

        # Verify deletion
        get_response = authenticated_client.get(
            f"/api/v1/maintenance/reminders/{reminder_id}"
        )
        assert get_response.status_code == 404

    def test_delete_reminder_not_found(self, authenticated_client):
        """Test deleting non-existent reminder"""
        response = authenticated_client.delete(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404
