"""
Tests for Admin API endpoints

Tests admin-only user management, system stats, data export/import,
and storage management endpoints.
"""
import pytest
from app.models.user import User
from app.models.tank import Tank
from app.models.note import Note
from app.models.livestock import Livestock
from app.models.maintenance import MaintenanceReminder
from app.models.equipment import Equipment
from app.core.security import get_password_hash, create_access_token


@pytest.fixture
def admin_user(db_session, fake):
    """Create an admin user in the database."""
    user = User(
        email=fake.email(),
        username=fake.user_name(),
        hashed_password=get_password_hash("adminpassword123"),
        is_admin=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user):
    """Generate an access token for the admin user."""
    return create_access_token(subject=admin_user.email)


@pytest.fixture
def admin_client(client, admin_token):
    """Create a test client with admin authentication header."""
    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {admin_token}",
    }
    return client


@pytest.fixture
def second_user(db_session, fake):
    """Create a second (non-admin) user."""
    user = User(
        email=fake.email(),
        username=fake.user_name(),
        hashed_password=get_password_hash("userpassword123"),
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def user_with_data(db_session, fake, second_user):
    """Create a user with associated tanks and data."""
    tank = Tank(
        name="Test Reef Tank",
        user_id=second_user.id,
        water_type="saltwater",
        display_volume_liters=300,
    )
    db_session.add(tank)
    db_session.commit()
    db_session.refresh(tank)

    note = Note(
        content="Test note content",
        user_id=second_user.id,
        tank_id=tank.id,
    )
    db_session.add(note)

    livestock = Livestock(
        species_name="Amphiprion ocellaris",
        common_name="Clownfish",
        type="fish",
        quantity=2,
        user_id=second_user.id,
        tank_id=tank.id,
    )
    db_session.add(livestock)

    equipment = Equipment(
        name="Protein Skimmer",
        equipment_type="skimmer",
        user_id=second_user.id,
        tank_id=tank.id,
    )
    db_session.add(equipment)

    from datetime import date
    reminder = MaintenanceReminder(
        title="Water Change",
        reminder_type="water_change",
        frequency_days=7,
        next_due=date.today(),
        user_id=second_user.id,
        tank_id=tank.id,
    )
    db_session.add(reminder)

    db_session.commit()
    return second_user


# ============================================================================
# User Management Tests
# ============================================================================


class TestListUsers:
    def test_list_users_as_admin(self, admin_client, admin_user):
        response = admin_client.get("/api/v1/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(u["email"] == admin_user.email for u in data)

    def test_list_users_with_pagination(self, admin_client, admin_user, second_user):
        response = admin_client.get("/api/v1/admin/users?skip=0&limit=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    def test_list_users_unauthorized(self, client):
        response = client.get("/api/v1/admin/users")
        assert response.status_code == 401

    def test_list_users_non_admin(self, client, test_user_token):
        client.headers = {"Authorization": f"Bearer {test_user_token}"}
        response = client.get("/api/v1/admin/users")
        assert response.status_code == 403


class TestGetUser:
    def test_get_user_by_id(self, admin_client, second_user):
        response = admin_client.get(f"/api/v1/admin/users/{second_user.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == second_user.email
        assert data["username"] == second_user.username

    def test_get_nonexistent_user(self, admin_client):
        import uuid
        fake_id = str(uuid.uuid4())
        response = admin_client.get(f"/api/v1/admin/users/{fake_id}")
        assert response.status_code == 404

    def test_get_user_non_admin(self, client, test_user_token, second_user):
        client.headers = {"Authorization": f"Bearer {test_user_token}"}
        response = client.get(f"/api/v1/admin/users/{second_user.id}")
        assert response.status_code == 403


class TestUpdateUser:
    def test_update_username(self, admin_client, second_user):
        response = admin_client.put(
            f"/api/v1/admin/users/{second_user.id}",
            json={"username": "newusername"},
        )
        assert response.status_code == 200
        assert response.json()["username"] == "newusername"

    def test_update_email(self, admin_client, second_user):
        response = admin_client.put(
            f"/api/v1/admin/users/{second_user.id}",
            json={"email": "newemail@example.com"},
        )
        assert response.status_code == 200
        assert response.json()["email"] == "newemail@example.com"

    def test_update_is_admin(self, admin_client, second_user):
        response = admin_client.put(
            f"/api/v1/admin/users/{second_user.id}",
            json={"is_admin": True},
        )
        assert response.status_code == 200
        assert response.json()["is_admin"] is True

    def test_update_password(self, admin_client, second_user):
        response = admin_client.put(
            f"/api/v1/admin/users/{second_user.id}",
            json={"password": "newpassword123"},
        )
        assert response.status_code == 200

    def test_update_nonexistent_user(self, admin_client):
        import uuid
        fake_id = str(uuid.uuid4())
        response = admin_client.put(
            f"/api/v1/admin/users/{fake_id}",
            json={"username": "whatever"},
        )
        assert response.status_code == 404

    def test_update_duplicate_email(self, admin_client, admin_user, second_user):
        response = admin_client.put(
            f"/api/v1/admin/users/{second_user.id}",
            json={"email": admin_user.email},
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]


class TestDeleteUser:
    def test_delete_user(self, admin_client, second_user):
        response = admin_client.delete(f"/api/v1/admin/users/{second_user.id}")
        assert response.status_code == 204

    def test_delete_nonexistent_user(self, admin_client):
        import uuid
        fake_id = str(uuid.uuid4())
        response = admin_client.delete(f"/api/v1/admin/users/{fake_id}")
        assert response.status_code == 404

    def test_cannot_delete_self(self, admin_client, admin_user):
        response = admin_client.delete(f"/api/v1/admin/users/{admin_user.id}")
        assert response.status_code == 400
        assert "Cannot delete your own" in response.json()["detail"]

    def test_delete_user_non_admin(self, client, test_user_token, second_user):
        client.headers = {"Authorization": f"Bearer {test_user_token}"}
        response = client.delete(f"/api/v1/admin/users/{second_user.id}")
        assert response.status_code == 403


# ============================================================================
# System Stats Tests
# ============================================================================


class TestSystemStats:
    def test_get_stats(self, admin_client, admin_user):
        response = admin_client.get("/api/v1/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_tanks" in data
        assert "total_photos" in data
        assert "total_notes" in data
        assert "total_livestock" in data
        assert "total_reminders" in data
        assert "total_equipment" in data
        assert data["total_users"] >= 1

    def test_stats_counts_are_correct(self, admin_client, user_with_data):
        response = admin_client.get("/api/v1/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_tanks"] >= 1
        assert data["total_notes"] >= 1
        assert data["total_livestock"] >= 1
        assert data["total_equipment"] >= 1

    def test_stats_unauthorized(self, client):
        response = client.get("/api/v1/admin/stats")
        assert response.status_code == 401


# ============================================================================
# User Data Summary Tests
# ============================================================================


class TestUserDataSummary:
    def test_get_data_summary(self, admin_client, user_with_data):
        response = admin_client.get(
            f"/api/v1/admin/users/{user_with_data.id}/data-summary"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tanks"] >= 1
        assert data["notes"] >= 1
        assert data["livestock"] >= 1
        assert data["total_items"] >= 3

    def test_data_summary_nonexistent_user(self, admin_client):
        import uuid
        fake_id = str(uuid.uuid4())
        response = admin_client.get(f"/api/v1/admin/users/{fake_id}/data-summary")
        assert response.status_code == 404


# ============================================================================
# Export/Import Tests
# ============================================================================


class TestExportUserData:
    def test_export_user_data(self, admin_client, user_with_data):
        response = admin_client.get(f"/api/v1/admin/export/{user_with_data.id}")
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "tanks" in data
        assert "notes" in data
        assert "livestock" in data
        assert "exported_at" in data
        assert data["user"]["email"] == user_with_data.email
        assert len(data["tanks"]) >= 1

    def test_export_nonexistent_user(self, admin_client):
        import uuid
        fake_id = str(uuid.uuid4())
        response = admin_client.get(f"/api/v1/admin/export/{fake_id}")
        assert response.status_code == 404


class TestExportFullDatabase:
    def test_export_full_database(self, admin_client, user_with_data):
        response = admin_client.get("/api/v1/admin/database/export")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "tanks" in data
        assert "notes" in data
        assert "livestock" in data
        assert "reminders" in data
        assert "total_records" in data
        assert data["total_records"]["users"] >= 1
        assert data["total_records"]["tanks"] >= 1


class TestImportUserData:
    def test_import_data_for_user(self, admin_client, admin_user, db_session):
        # Create a target user
        target_user = User(
            email="import_target@example.com",
            username="importtarget",
            hashed_password=get_password_hash("password123"),
        )
        db_session.add(target_user)
        db_session.commit()
        db_session.refresh(target_user)

        # First create a tank so import has something to link to
        tank = Tank(name="Import Tank", user_id=target_user.id, water_type="saltwater")
        db_session.add(tank)
        db_session.commit()

        import_data = {
            "tanks": [
                {
                    "name": "Imported Tank",
                    "water_type": "freshwater",
                    "display_volume_liters": 150,
                }
            ],
        }

        response = admin_client.post(
            f"/api/v1/admin/import/{target_user.id}",
            json=import_data,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["imported"]["tanks"] == 1

    def test_import_nonexistent_user(self, admin_client):
        import uuid
        fake_id = str(uuid.uuid4())
        response = admin_client.post(
            f"/api/v1/admin/import/{fake_id}",
            json={"tanks": []},
        )
        assert response.status_code == 404


class TestImportFullDatabase:
    def test_import_database_adds_data(self, admin_client, admin_user):
        import_data = {
            "users": [
                {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "email": "imported_user@example.com",
                    "username": "imported_user",
                    "is_admin": False,
                }
            ],
            "tanks": [],
            "notes": [],
            "livestock": [],
            "reminders": [],
        }

        response = admin_client.post(
            "/api/v1/admin/database/import",
            json=import_data,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["imported"]["users"] == 1


# ============================================================================
# Users With Stats Tests
# ============================================================================


class TestUsersWithStats:
    def test_list_users_with_stats(self, admin_client, user_with_data):
        response = admin_client.get("/api/v1/admin/users-with-stats")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

        # Find the user with data
        user_stats = next(
            (u for u in data if u["id"] == str(user_with_data.id)), None
        )
        assert user_stats is not None
        assert user_stats["tank_count"] >= 1
        assert user_stats["livestock_count"] >= 1
        assert user_stats["equipment_count"] >= 1
        assert user_stats["total_records"] >= 3


# ============================================================================
# Tank Export Tests
# ============================================================================


class TestExportTankData:
    def test_export_tank_data(self, admin_client, user_with_data, db_session):
        tank = db_session.query(Tank).filter(
            Tank.user_id == user_with_data.id
        ).first()

        response = admin_client.get(
            f"/api/v1/admin/export/{user_with_data.id}/tank/{tank.id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "tank" in data
        assert "notes" in data
        assert "livestock" in data
        assert "equipment" in data
        assert data["tank"]["name"] == "Test Reef Tank"

    def test_export_nonexistent_tank(self, admin_client, user_with_data):
        import uuid
        fake_tank_id = str(uuid.uuid4())
        response = admin_client.get(
            f"/api/v1/admin/export/{user_with_data.id}/tank/{fake_tank_id}"
        )
        assert response.status_code == 404

    def test_export_tank_nonexistent_user(self, admin_client):
        import uuid
        fake_user_id = str(uuid.uuid4())
        fake_tank_id = str(uuid.uuid4())
        response = admin_client.get(
            f"/api/v1/admin/export/{fake_user_id}/tank/{fake_tank_id}"
        )
        assert response.status_code == 404


# ============================================================================
# Storage Endpoints (basic tests without actual file system)
# ============================================================================


class TestStorageStats:
    def test_get_storage_stats(self, admin_client):
        response = admin_client.get("/api/v1/admin/storage/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_size_bytes" in data
        assert "total_files" in data
        assert "categories" in data
        assert "orphan_count" in data

    def test_storage_stats_unauthorized(self, client):
        response = client.get("/api/v1/admin/storage/stats")
        assert response.status_code == 401


class TestStorageFiles:
    def test_list_storage_files(self, admin_client):
        response = admin_client.get("/api/v1/admin/storage/files")
        assert response.status_code == 200
        # Returns a list (possibly empty if no uploads dir)
        assert isinstance(response.json(), list)

    def test_storage_files_unauthorized(self, client):
        response = client.get("/api/v1/admin/storage/files")
        assert response.status_code == 401


class TestDeleteOrphans:
    def test_delete_orphans(self, admin_client):
        response = admin_client.delete("/api/v1/admin/storage/orphans")
        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data
        assert "freed_bytes" in data

    def test_delete_orphans_unauthorized(self, client):
        response = client.delete("/api/v1/admin/storage/orphans")
        assert response.status_code == 401


class TestDownloadFile:
    def test_download_nonexistent_file(self, admin_client):
        response = admin_client.get("/api/v1/admin/storage/download/nonexistent.txt")
        assert response.status_code == 404

    def test_download_unauthorized(self, client):
        response = client.get("/api/v1/admin/storage/download/test.txt")
        assert response.status_code == 401


class TestDownloadAll:
    def test_download_all(self, admin_client):
        response = admin_client.get("/api/v1/admin/storage/download-all")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert "aquascope_backup_" in response.headers.get("content-disposition", "")

    def test_download_all_unauthorized(self, client):
        response = client.get("/api/v1/admin/storage/download-all")
        assert response.status_code == 401
