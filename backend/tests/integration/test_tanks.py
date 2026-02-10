"""
Integration tests for Tank CRUD API endpoints

Covers:
- Full CRUD lifecycle (create, list, get, update, delete)
- Authentication enforcement (401 without token)
- 404 for non-existent resources
- Multi-tenancy: users can only access their own tanks
- Tank events sub-resource CRUD
- Tank image upload/download edge cases
"""
import io
import pytest
from datetime import date
from uuid import uuid4

from app.core.security import get_password_hash, create_access_token
from app.models.user import User
from app.models.tank import Tank, TankEvent


# ---------------------------------------------------------------------------
# Tank CRUD
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestCreateTank:
    """POST /api/v1/tanks/"""

    def test_create_tank_minimal(self, authenticated_client):
        """Create a tank with only the required fields (name, water_type)"""
        response = authenticated_client.post(
            "/api/v1/tanks",
            json={
                "name": "My Reef Tank",
                "water_type": "saltwater",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "My Reef Tank"
        assert data["water_type"] == "saltwater"
        assert "id" in data
        assert "user_id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_tank_all_fields(self, authenticated_client):
        """Create a tank with every optional field populated"""
        payload = {
            "name": "Display Reef",
            "water_type": "saltwater",
            "aquarium_subtype": "sps_dominant",
            "display_volume_liters": 400.0,
            "sump_volume_liters": 100.0,
            "description": "Main display reef tank",
            "setup_date": "2024-01-15",
        }
        response = authenticated_client.post("/api/v1/tanks", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Display Reef"
        assert data["display_volume_liters"] == 400.0
        assert data["sump_volume_liters"] == 100.0
        assert data["aquarium_subtype"] == "sps_dominant"
        assert data["description"] == "Main display reef tank"
        assert data["setup_date"] == "2024-01-15"
        # total_volume_liters should be display + sump
        assert data["total_volume_liters"] == 500.0

    def test_create_freshwater_tank(self, authenticated_client):
        """Create a freshwater tank with subtype"""
        response = authenticated_client.post(
            "/api/v1/tanks",
            json={
                "name": "Planted Tank",
                "water_type": "freshwater",
                "aquarium_subtype": "amazonian",
                "display_volume_liters": 200.0,
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["water_type"] == "freshwater"
        assert data["aquarium_subtype"] == "amazonian"

    def test_create_brackish_tank(self, authenticated_client):
        """Create a brackish water tank"""
        response = authenticated_client.post(
            "/api/v1/tanks",
            json={
                "name": "Brackish Tank",
                "water_type": "brackish",
            },
        )

        assert response.status_code == 201
        assert response.json()["water_type"] == "brackish"

    def test_create_tank_missing_name(self, authenticated_client):
        """Validation error when name is missing"""
        response = authenticated_client.post(
            "/api/v1/tanks",
            json={"water_type": "saltwater"},
        )

        assert response.status_code == 422

    def test_create_tank_unauthenticated(self, client):
        """401 when creating a tank without a token"""
        response = client.post(
            "/api/v1/tanks",
            json={"name": "No Auth", "water_type": "saltwater"},
        )

        assert response.status_code == 401


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestListTanks:
    """GET /api/v1/tanks/"""

    def test_list_tanks_empty(self, authenticated_client):
        """Listing tanks returns an empty list when user has none"""
        response = authenticated_client.get("/api/v1/tanks")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_tanks_multiple(self, authenticated_client):
        """List returns all tanks belonging to the user"""
        authenticated_client.post(
            "/api/v1/tanks", json={"name": "Tank A", "water_type": "saltwater"}
        )
        authenticated_client.post(
            "/api/v1/tanks", json={"name": "Tank B", "water_type": "freshwater"}
        )

        response = authenticated_client.get("/api/v1/tanks")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        names = {t["name"] for t in data}
        assert names == {"Tank A", "Tank B"}

    def test_list_tanks_with_db_fixture(self, authenticated_client, test_user, db_session):
        """List tanks created directly via ORM"""
        tank1 = Tank(user_id=test_user.id, name="Tank 1", display_volume_liters=100.0)
        tank2 = Tank(user_id=test_user.id, name="Tank 2", display_volume_liters=150.0)
        db_session.add_all([tank1, tank2])
        db_session.commit()

        response = authenticated_client.get("/api/v1/tanks")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] in ["Tank 1", "Tank 2"]

    def test_list_tanks_unauthenticated(self, client):
        """401 when listing tanks without a token"""
        response = client.get("/api/v1/tanks")

        assert response.status_code == 401


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestGetTank:
    """GET /api/v1/tanks/{tank_id}"""

    def test_get_tank_by_id(self, authenticated_client):
        """Retrieve a single tank by its ID"""
        create_resp = authenticated_client.post(
            "/api/v1/tanks", json={"name": "Nano Reef", "water_type": "saltwater"}
        )
        tank_id = create_resp.json()["id"]

        response = authenticated_client.get(f"/api/v1/tanks/{tank_id}")

        assert response.status_code == 200
        assert response.json()["id"] == tank_id
        assert response.json()["name"] == "Nano Reef"

    def test_get_tank_with_db_fixture(self, authenticated_client, test_user, db_session):
        """Retrieve a tank created via the ORM"""
        tank = Tank(user_id=test_user.id, name="Test Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.get(f"/api/v1/tanks/{tank.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(tank.id)
        assert data["name"] == "Test Tank"

    def test_get_tank_not_found(self, authenticated_client):
        """404 when requesting a non-existent tank ID"""
        fake_id = str(uuid4())
        response = authenticated_client.get(f"/api/v1/tanks/{fake_id}")

        assert response.status_code == 404

    def test_get_tank_unauthenticated(self, client):
        """401 when getting a tank without a token"""
        fake_id = str(uuid4())
        response = client.get(f"/api/v1/tanks/{fake_id}")

        assert response.status_code == 401


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestUpdateTank:
    """PUT /api/v1/tanks/{tank_id}"""

    def test_update_tank(self, authenticated_client):
        """Update a tank's fields"""
        create_resp = authenticated_client.post(
            "/api/v1/tanks", json={"name": "Old Name", "water_type": "saltwater"}
        )
        tank_id = create_resp.json()["id"]

        response = authenticated_client.put(
            f"/api/v1/tanks/{tank_id}",
            json={"name": "New Name", "description": "Updated description"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["description"] == "Updated description"

    def test_update_tank_partial(self, authenticated_client):
        """Partial update: only provided fields are changed"""
        create_resp = authenticated_client.post(
            "/api/v1/tanks",
            json={
                "name": "Reef",
                "water_type": "saltwater",
                "description": "Original",
            },
        )
        tank_id = create_resp.json()["id"]

        response = authenticated_client.put(
            f"/api/v1/tanks/{tank_id}",
            json={"description": "Changed"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Reef"  # unchanged
        assert data["description"] == "Changed"

    def test_update_tank_volume(self, authenticated_client, test_user, db_session):
        """Update volume fields via ORM-created tank"""
        tank = Tank(user_id=test_user.id, name="Old Name", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.put(
            f"/api/v1/tanks/{tank.id}",
            json={"name": "New Name", "display_volume_liters": 150.0},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["display_volume_liters"] == 150.0

    def test_update_tank_not_found(self, authenticated_client):
        """404 when updating a non-existent tank"""
        fake_id = str(uuid4())
        response = authenticated_client.put(
            f"/api/v1/tanks/{fake_id}",
            json={"name": "Whatever"},
        )

        assert response.status_code == 404


# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestDeleteTank:
    """DELETE /api/v1/tanks/{tank_id}"""

    def test_delete_tank(self, authenticated_client):
        """Delete a tank and verify it is gone"""
        create_resp = authenticated_client.post(
            "/api/v1/tanks", json={"name": "Doomed", "water_type": "saltwater"}
        )
        tank_id = create_resp.json()["id"]

        delete_resp = authenticated_client.delete(f"/api/v1/tanks/{tank_id}")
        assert delete_resp.status_code == 204

        # Verify it no longer exists
        get_resp = authenticated_client.get(f"/api/v1/tanks/{tank_id}")
        assert get_resp.status_code == 404

    def test_delete_tank_with_db_fixture(self, authenticated_client, test_user, db_session):
        """Delete an ORM-created tank"""
        tank = Tank(user_id=test_user.id, name="To Delete", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)
        tank_id = tank.id

        response = authenticated_client.delete(f"/api/v1/tanks/{tank_id}")
        assert response.status_code == 204

        # Verify deletion
        response = authenticated_client.get(f"/api/v1/tanks/{tank_id}")
        assert response.status_code == 404

    def test_delete_tank_not_found(self, authenticated_client):
        """404 when deleting a non-existent tank"""
        fake_id = str(uuid4())
        response = authenticated_client.delete(f"/api/v1/tanks/{fake_id}")

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Multi-tenancy
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestTankMultiTenancy:
    """Users must only be able to access their own tanks"""

    def test_user_cannot_read_other_users_tank(
        self, client, db_session, authenticated_client, fake
    ):
        """Another user's tank returns 404, not the data"""
        # Create a tank as the default test user
        create_resp = authenticated_client.post(
            "/api/v1/tanks", json={"name": "Private Tank", "water_type": "saltwater"}
        )
        assert create_resp.status_code == 201
        tank_id = create_resp.json()["id"]

        # Create a second user
        other_user = User(
            email=fake.email(),
            username=fake.user_name(),
            hashed_password=get_password_hash("password123"),
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)
        other_token = create_access_token(subject=other_user.email)
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # GET -- should return 404 (no info leak)
        get_resp = client.get(f"/api/v1/tanks/{tank_id}", headers=other_headers)
        assert get_resp.status_code == 404

    def test_user_cannot_update_other_users_tank(
        self, client, db_session, authenticated_client, fake
    ):
        """PUT on another user's tank returns 404"""
        create_resp = authenticated_client.post(
            "/api/v1/tanks", json={"name": "Private Tank", "water_type": "saltwater"}
        )
        tank_id = create_resp.json()["id"]

        other_user = User(
            email=fake.email(),
            username=fake.user_name(),
            hashed_password=get_password_hash("password123"),
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)
        other_token = create_access_token(subject=other_user.email)
        other_headers = {"Authorization": f"Bearer {other_token}"}

        put_resp = client.put(
            f"/api/v1/tanks/{tank_id}",
            json={"name": "Hacked"},
            headers=other_headers,
        )
        assert put_resp.status_code == 404

    def test_user_cannot_delete_other_users_tank(
        self, client, db_session, authenticated_client, fake
    ):
        """DELETE on another user's tank returns 404"""
        create_resp = authenticated_client.post(
            "/api/v1/tanks", json={"name": "Private Tank", "water_type": "saltwater"}
        )
        tank_id = create_resp.json()["id"]

        other_user = User(
            email=fake.email(),
            username=fake.user_name(),
            hashed_password=get_password_hash("password123"),
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)
        other_token = create_access_token(subject=other_user.email)
        other_headers = {"Authorization": f"Bearer {other_token}"}

        del_resp = client.delete(f"/api/v1/tanks/{tank_id}", headers=other_headers)
        assert del_resp.status_code == 404

    def test_user_list_shows_only_own_tanks(
        self, client, db_session, authenticated_client, fake
    ):
        """LIST for another user returns empty, not our tanks"""
        authenticated_client.post(
            "/api/v1/tanks", json={"name": "My Tank", "water_type": "saltwater"}
        )

        other_user = User(
            email=fake.email(),
            username=fake.user_name(),
            hashed_password=get_password_hash("password123"),
        )
        db_session.add(other_user)
        db_session.commit()
        db_session.refresh(other_user)
        other_token = create_access_token(subject=other_user.email)
        other_headers = {"Authorization": f"Bearer {other_token}"}

        list_resp = client.get("/api/v1/tanks", headers=other_headers)
        assert list_resp.status_code == 200
        assert list_resp.json() == []


# ---------------------------------------------------------------------------
# Tank Events
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestTankEvents:
    """Tests for tank events CRUD sub-resource"""

    def test_create_tank_event(self, authenticated_client, test_user, db_session):
        """Create a milestone event for a tank"""
        tank = Tank(user_id=test_user.id, name="Event Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.post(
            f"/api/v1/tanks/{tank.id}/events",
            json={
                "title": "Tank Setup",
                "description": "Initial setup complete",
                "event_date": str(date.today()),
                "event_type": "milestone",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Tank Setup"
        assert data["event_type"] == "milestone"
        assert data["tank_id"] == str(tank.id)

    def test_create_tank_event_invalid_tank(self, authenticated_client):
        """404 when creating an event for a non-existent tank"""
        response = authenticated_client.post(
            "/api/v1/tanks/00000000-0000-0000-0000-000000000000/events",
            json={"title": "Test Event", "event_date": str(date.today())},
        )
        assert response.status_code == 404

    def test_list_tank_events(self, authenticated_client, test_user, db_session):
        """List events ordered by date descending"""
        tank = Tank(user_id=test_user.id, name="Event Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        event1 = TankEvent(
            tank_id=tank.id, user_id=test_user.id,
            title="Event 1", event_date=date(2026, 1, 1),
        )
        event2 = TankEvent(
            tank_id=tank.id, user_id=test_user.id,
            title="Event 2", event_date=date(2026, 2, 1),
        )
        db_session.add_all([event1, event2])
        db_session.commit()

        response = authenticated_client.get(f"/api/v1/tanks/{tank.id}/events")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        # Should be ordered by date desc
        assert data[0]["title"] == "Event 2"

    def test_list_tank_events_invalid_tank(self, authenticated_client):
        """404 when listing events for a non-existent tank"""
        response = authenticated_client.get(
            "/api/v1/tanks/00000000-0000-0000-0000-000000000000/events"
        )
        assert response.status_code == 404

    def test_update_tank_event(self, authenticated_client, test_user, db_session):
        """Update an event's title and description"""
        tank = Tank(user_id=test_user.id, name="Event Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        event = TankEvent(
            tank_id=tank.id, user_id=test_user.id,
            title="Original Title", event_date=date.today(),
        )
        db_session.add(event)
        db_session.commit()
        db_session.refresh(event)

        response = authenticated_client.put(
            f"/api/v1/tanks/{tank.id}/events/{event.id}",
            json={"title": "Updated Title", "description": "Added details"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["description"] == "Added details"

    def test_update_tank_event_not_found(self, authenticated_client, test_user, db_session):
        """404 when updating a non-existent event"""
        tank = Tank(user_id=test_user.id, name="Event Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.put(
            f"/api/v1/tanks/{tank.id}/events/00000000-0000-0000-0000-000000000000",
            json={"title": "Test"},
        )
        assert response.status_code == 404

    def test_delete_tank_event(self, authenticated_client, test_user, db_session):
        """Delete an event and verify removal"""
        tank = Tank(user_id=test_user.id, name="Event Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        event = TankEvent(
            tank_id=tank.id, user_id=test_user.id,
            title="To Delete", event_date=date.today(),
        )
        db_session.add(event)
        db_session.commit()
        db_session.refresh(event)

        response = authenticated_client.delete(
            f"/api/v1/tanks/{tank.id}/events/{event.id}"
        )
        assert response.status_code == 204

        # Verify deletion
        response = authenticated_client.get(f"/api/v1/tanks/{tank.id}/events")
        assert response.status_code == 200
        assert len(response.json()) == 0

    def test_delete_tank_event_not_found(self, authenticated_client, test_user, db_session):
        """404 when deleting a non-existent event"""
        tank = Tank(user_id=test_user.id, name="Event Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.delete(
            f"/api/v1/tanks/{tank.id}/events/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Tank Image
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestTankImage:
    """Tests for tank image upload/download edge cases"""

    def test_upload_image_invalid_tank(self, authenticated_client):
        """404 when uploading to a non-existent tank"""
        response = authenticated_client.post(
            "/api/v1/tanks/00000000-0000-0000-0000-000000000000/upload-image",
            files={"file": ("test.jpg", io.BytesIO(b"fake image data"), "image/jpeg")},
        )
        assert response.status_code == 404

    def test_upload_image_invalid_type(self, authenticated_client, test_user, db_session):
        """400 when uploading a non-image file"""
        tank = Tank(user_id=test_user.id, name="Image Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.post(
            f"/api/v1/tanks/{tank.id}/upload-image",
            files={"file": ("test.pdf", io.BytesIO(b"fake pdf data"), "application/pdf")},
        )
        assert response.status_code == 400

    def test_get_image_no_image(self, authenticated_client, test_user, db_session):
        """404 when tank has no image uploaded"""
        tank = Tank(user_id=test_user.id, name="No Image Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.get(f"/api/v1/tanks/{tank.id}/image")
        assert response.status_code == 404

    def test_get_image_invalid_tank(self, authenticated_client):
        """404 when getting image for non-existent tank"""
        response = authenticated_client.get(
            "/api/v1/tanks/00000000-0000-0000-0000-000000000000/image"
        )
        assert response.status_code == 404
