"""
Integration tests for Notes and Maintenance Reminder CRUD API endpoints

Notes and maintenance reminders both belong to a tank.

Notes covers:
- Full CRUD lifecycle (create, list, get, update, delete)
- Filtering by tank_id
- 404 for non-existent notes or tanks
- Authentication enforcement

Maintenance covers:
- Full CRUD lifecycle for reminders
- Completing a reminder (auto-calculates next_due)
- Filtering by tank_id, active_only, overdue_only
- 404 for non-existent reminders or tanks
- Authentication enforcement
"""
import pytest
from datetime import date, timedelta

from app.models.tank import Tank
from app.models.note import Note
from app.models.maintenance import MaintenanceReminder


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def test_tank(db_session, test_user):
    """Create a test tank shared by notes and maintenance tests"""
    tank = Tank(
        name="Notes/Maintenance Test Tank",
        display_volume_liters=200,
        sump_volume_liters=50,
        user_id=test_user.id,
    )
    db_session.add(tank)
    db_session.commit()
    db_session.refresh(tank)
    return tank


@pytest.fixture
def second_tank(db_session, test_user):
    """A second tank for cross-tank filtering tests"""
    tank = Tank(
        name="Second Tank",
        display_volume_liters=100,
        user_id=test_user.id,
    )
    db_session.add(tank)
    db_session.commit()
    db_session.refresh(tank)
    return tank


@pytest.fixture
def test_note(db_session, test_user, test_tank):
    """Create a test note"""
    note = Note(
        tank_id=test_tank.id,
        user_id=test_user.id,
        content="Observed coral spawning tonight",
    )
    db_session.add(note)
    db_session.commit()
    db_session.refresh(note)
    return note


@pytest.fixture
def test_reminder(db_session, test_user, test_tank):
    """Create a test maintenance reminder"""
    reminder = MaintenanceReminder(
        tank_id=test_tank.id,
        user_id=test_user.id,
        title="Weekly Water Change",
        description="Change 10% of water",
        reminder_type="water_change",
        frequency_days=7,
        next_due=date.today() + timedelta(days=3),
    )
    db_session.add(reminder)
    db_session.commit()
    db_session.refresh(reminder)
    return reminder


# ===========================================================================
# NOTES
# ===========================================================================


@pytest.mark.integration
class TestCreateNote:
    """POST /api/v1/notes/"""

    def test_create_note_success(self, authenticated_client, test_tank):
        """Create a note with required fields (tank_id, content)"""
        response = authenticated_client.post(
            "/api/v1/notes",
            json={
                "tank_id": str(test_tank.id),
                "content": "Added new coral today",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "Added new coral today"
        assert data["tank_id"] == str(test_tank.id)
        assert "id" in data
        assert "user_id" in data
        assert "created_at" in data

    def test_create_note_long_content(self, authenticated_client, test_tank):
        """Create a note with a long content body"""
        long_content = "Detailed observation. " * 100  # ~2200 chars
        response = authenticated_client.post(
            "/api/v1/notes",
            json={
                "tank_id": str(test_tank.id),
                "content": long_content,
            },
        )

        assert response.status_code == 201
        assert response.json()["content"] == long_content

    def test_create_note_invalid_tank(self, authenticated_client):
        """404 when the referenced tank does not exist"""
        response = authenticated_client.post(
            "/api/v1/notes",
            json={
                "tank_id": "00000000-0000-0000-0000-000000000000",
                "content": "This should fail",
            },
        )
        assert response.status_code == 404

    def test_create_note_missing_content(self, authenticated_client, test_tank):
        """422 when content is missing"""
        response = authenticated_client.post(
            "/api/v1/notes",
            json={"tank_id": str(test_tank.id)},
        )
        assert response.status_code == 422

    def test_create_note_missing_tank_id(self, authenticated_client):
        """422 when tank_id is missing"""
        response = authenticated_client.post(
            "/api/v1/notes",
            json={"content": "Missing tank"},
        )
        assert response.status_code == 422

    def test_create_note_unauthenticated(self, client, test_tank):
        """401 when creating a note without a token"""
        response = client.post(
            "/api/v1/notes",
            json={
                "tank_id": str(test_tank.id),
                "content": "No auth",
            },
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestListNotes:
    """GET /api/v1/notes/"""

    def test_list_notes_all(self, authenticated_client, test_note):
        """List all notes for the user"""
        response = authenticated_client.get("/api/v1/notes")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(n["id"] == str(test_note.id) for n in data)

    def test_list_notes_by_tank(
        self, authenticated_client, test_user, db_session, test_tank, second_tank
    ):
        """Filter notes by tank_id returns only that tank's notes"""
        note_a = Note(user_id=test_user.id, tank_id=test_tank.id, content="Tank A note")
        note_b = Note(user_id=test_user.id, tank_id=second_tank.id, content="Tank B note")
        db_session.add_all([note_a, note_b])
        db_session.commit()

        response = authenticated_client.get(f"/api/v1/notes?tank_id={test_tank.id}")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(n["tank_id"] == str(test_tank.id) for n in data)

    def test_list_notes_invalid_tank(self, authenticated_client):
        """404 when filtering by a non-existent tank_id"""
        response = authenticated_client.get(
            "/api/v1/notes?tank_id=00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    def test_list_notes_empty(self, authenticated_client):
        """Empty list when user has no notes"""
        response = authenticated_client.get("/api/v1/notes")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_notes_unauthenticated(self, client):
        """401 when listing notes without a token"""
        response = client.get("/api/v1/notes")
        assert response.status_code == 401


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestGetNote:
    """GET /api/v1/notes/{note_id}"""

    def test_get_note_success(self, authenticated_client, test_note):
        """Retrieve a note by ID"""
        response = authenticated_client.get(f"/api/v1/notes/{test_note.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_note.id)
        assert data["content"] == "Observed coral spawning tonight"

    def test_get_note_not_found(self, authenticated_client):
        """404 for a non-existent note ID"""
        response = authenticated_client.get(
            "/api/v1/notes/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestUpdateNote:
    """PUT /api/v1/notes/{note_id}"""

    def test_update_note_success(self, authenticated_client, test_note):
        """Update a note's content"""
        response = authenticated_client.put(
            f"/api/v1/notes/{test_note.id}",
            json={"content": "Updated observation notes"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["content"] == "Updated observation notes"
        assert data["id"] == str(test_note.id)

    def test_update_note_not_found(self, authenticated_client):
        """404 when updating a non-existent note"""
        response = authenticated_client.put(
            "/api/v1/notes/00000000-0000-0000-0000-000000000000",
            json={"content": "This should fail"},
        )
        assert response.status_code == 404

    def test_update_note_empty_content(self, authenticated_client, test_note):
        """422 when updating with empty content"""
        response = authenticated_client.put(
            f"/api/v1/notes/{test_note.id}",
            json={"content": ""},
        )
        assert response.status_code == 422


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestDeleteNote:
    """DELETE /api/v1/notes/{note_id}"""

    def test_delete_note_success(self, authenticated_client, test_note):
        """Delete a note and verify it is gone"""
        note_id = test_note.id

        response = authenticated_client.delete(f"/api/v1/notes/{note_id}")
        assert response.status_code == 204

        # Verify deletion
        get_resp = authenticated_client.get(f"/api/v1/notes/{note_id}")
        assert get_resp.status_code == 404

    def test_delete_note_not_found(self, authenticated_client):
        """404 when deleting a non-existent note"""
        response = authenticated_client.delete(
            "/api/v1/notes/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


# ===========================================================================
# MAINTENANCE REMINDERS
# ===========================================================================


@pytest.mark.integration
class TestCreateReminder:
    """POST /api/v1/maintenance/reminders"""

    def test_create_reminder_success(self, authenticated_client, test_tank):
        """Create a maintenance reminder with all fields"""
        next_due = str(date.today() + timedelta(days=30))
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": str(test_tank.id),
                "title": "Pump Cleaning",
                "description": "Clean return pump impeller",
                "reminder_type": "pump_cleaning",
                "frequency_days": 30,
                "next_due": next_due,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Pump Cleaning"
        assert data["description"] == "Clean return pump impeller"
        assert data["reminder_type"] == "pump_cleaning"
        assert data["frequency_days"] == 30
        assert data["next_due"] == next_due
        assert data["is_active"] is True
        assert data["last_completed"] is None
        assert "id" in data
        assert "user_id" in data

    def test_create_reminder_minimal(self, authenticated_client, test_tank):
        """Create a reminder with only required fields"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": str(test_tank.id),
                "title": "Glass Cleaning",
                "reminder_type": "glass_cleaning",
                "frequency_days": 3,
                "next_due": str(date.today()),
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Glass Cleaning"
        assert data["description"] is None

    def test_create_reminder_invalid_tank(self, authenticated_client):
        """404 when the referenced tank does not exist"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": "00000000-0000-0000-0000-000000000000",
                "title": "Test",
                "reminder_type": "water_change",
                "frequency_days": 7,
                "next_due": str(date.today()),
            },
        )
        assert response.status_code == 404

    def test_create_reminder_missing_fields(self, authenticated_client, test_tank):
        """422 when required fields are missing"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": str(test_tank.id),
                "title": "Test",
                # Missing reminder_type, frequency_days, next_due
            },
        )
        assert response.status_code == 422

    def test_create_reminder_invalid_frequency(self, authenticated_client, test_tank):
        """422 when frequency_days is zero or negative"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": str(test_tank.id),
                "title": "Bad Frequency",
                "reminder_type": "water_change",
                "frequency_days": 0,
                "next_due": str(date.today()),
            },
        )
        assert response.status_code == 422

    def test_create_reminder_unauthenticated(self, client, test_tank):
        """401 when creating a reminder without a token"""
        response = client.post(
            "/api/v1/maintenance/reminders",
            json={
                "tank_id": str(test_tank.id),
                "title": "Test",
                "reminder_type": "water_change",
                "frequency_days": 7,
                "next_due": str(date.today()),
            },
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestListReminders:
    """GET /api/v1/maintenance/reminders"""

    def test_list_all_reminders(self, authenticated_client, test_reminder):
        """List returns at least the seeded reminder"""
        response = authenticated_client.get("/api/v1/maintenance/reminders")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(r["id"] == str(test_reminder.id) for r in data)

    def test_list_reminders_by_tank(
        self, authenticated_client, test_tank, test_reminder
    ):
        """Filter reminders by tank_id"""
        response = authenticated_client.get(
            f"/api/v1/maintenance/reminders?tank_id={test_tank.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert all(r["tank_id"] == str(test_tank.id) for r in data)

    def test_list_reminders_invalid_tank(self, authenticated_client):
        """404 when filtering by a non-existent tank_id"""
        response = authenticated_client.get(
            "/api/v1/maintenance/reminders?tank_id=00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    def test_list_active_only(self, authenticated_client, db_session, test_user, test_tank):
        """active_only=true excludes inactive reminders"""
        inactive = MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Inactive Reminder",
            reminder_type="other",
            frequency_days=7,
            next_due=date.today(),
            is_active=False,
        )
        db_session.add(inactive)
        db_session.commit()

        response = authenticated_client.get(
            "/api/v1/maintenance/reminders?active_only=true"
        )

        assert response.status_code == 200
        data = response.json()
        assert all(r["is_active"] for r in data)

    def test_list_overdue_only(
        self, authenticated_client, db_session, test_user, test_tank
    ):
        """overdue_only=true returns only reminders past their next_due date"""
        overdue = MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Overdue Water Change",
            reminder_type="water_change",
            frequency_days=7,
            next_due=date.today() - timedelta(days=3),
        )
        db_session.add(overdue)
        db_session.commit()

        response = authenticated_client.get(
            "/api/v1/maintenance/reminders?overdue_only=true"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        for r in data:
            assert date.fromisoformat(r["next_due"]) < date.today()

    def test_list_reminders_unauthenticated(self, client):
        """401 when listing reminders without a token"""
        response = client.get("/api/v1/maintenance/reminders")
        assert response.status_code == 401


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestGetReminder:
    """GET /api/v1/maintenance/reminders/{reminder_id}"""

    def test_get_reminder_success(self, authenticated_client, test_reminder):
        """Retrieve a specific reminder by ID"""
        response = authenticated_client.get(
            f"/api/v1/maintenance/reminders/{test_reminder.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_reminder.id)
        assert data["title"] == "Weekly Water Change"
        assert data["reminder_type"] == "water_change"
        assert data["frequency_days"] == 7

    def test_get_reminder_not_found(self, authenticated_client):
        """404 for a non-existent reminder ID"""
        response = authenticated_client.get(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestUpdateReminder:
    """PUT /api/v1/maintenance/reminders/{reminder_id}"""

    def test_update_reminder_success(self, authenticated_client, test_reminder):
        """Update title and frequency"""
        response = authenticated_client.put(
            f"/api/v1/maintenance/reminders/{test_reminder.id}",
            json={
                "title": "Bi-Weekly Water Change",
                "frequency_days": 14,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Bi-Weekly Water Change"
        assert data["frequency_days"] == 14
        # Unchanged fields
        assert data["reminder_type"] == "water_change"

    def test_update_reminder_deactivate(self, authenticated_client, test_reminder):
        """Deactivate a reminder"""
        response = authenticated_client.put(
            f"/api/v1/maintenance/reminders/{test_reminder.id}",
            json={"is_active": False},
        )

        assert response.status_code == 200
        assert response.json()["is_active"] is False

    def test_update_reminder_description(self, authenticated_client, test_reminder):
        """Update only the description"""
        response = authenticated_client.put(
            f"/api/v1/maintenance/reminders/{test_reminder.id}",
            json={"description": "Use RODI water, match temperature"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Use RODI water, match temperature"
        assert data["title"] == "Weekly Water Change"  # unchanged

    def test_update_reminder_not_found(self, authenticated_client):
        """404 when updating a non-existent reminder"""
        response = authenticated_client.put(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000",
            json={"title": "Test"},
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestCompleteReminder:
    """POST /api/v1/maintenance/reminders/{reminder_id}/complete"""

    def test_complete_reminder_default_date(self, authenticated_client, test_reminder):
        """Completing without a date uses today and advances next_due"""
        response = authenticated_client.post(
            f"/api/v1/maintenance/reminders/{test_reminder.id}/complete",
            json={},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["last_completed"] is not None
        expected_next = date.today() + timedelta(days=test_reminder.frequency_days)
        assert data["next_due"] == str(expected_next)

    def test_complete_reminder_custom_date(self, authenticated_client, test_reminder):
        """Completing with a custom date sets last_completed and calculates next_due from it"""
        custom_date = date.today() - timedelta(days=2)
        response = authenticated_client.post(
            f"/api/v1/maintenance/reminders/{test_reminder.id}/complete",
            json={"completed_date": str(custom_date)},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["last_completed"] == str(custom_date)
        expected_next = custom_date + timedelta(days=test_reminder.frequency_days)
        assert data["next_due"] == str(expected_next)

    def test_complete_reminder_not_found(self, authenticated_client):
        """404 when completing a non-existent reminder"""
        response = authenticated_client.post(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000/complete",
            json={},
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestDeleteReminder:
    """DELETE /api/v1/maintenance/reminders/{reminder_id}"""

    def test_delete_reminder_success(self, authenticated_client, test_reminder):
        """Delete a reminder and verify it is gone"""
        reminder_id = test_reminder.id

        response = authenticated_client.delete(
            f"/api/v1/maintenance/reminders/{reminder_id}"
        )
        assert response.status_code == 204

        # Verify deletion
        get_resp = authenticated_client.get(
            f"/api/v1/maintenance/reminders/{reminder_id}"
        )
        assert get_resp.status_code == 404

    def test_delete_reminder_not_found(self, authenticated_client):
        """404 when deleting a non-existent reminder"""
        response = authenticated_client.delete(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    def test_delete_reminder_unauthenticated(self, client):
        """401 when deleting a reminder without a token"""
        response = client.delete(
            "/api/v1/maintenance/reminders/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 401
