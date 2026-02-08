"""
Integration tests for tanks API endpoints
"""
import pytest
from datetime import date


@pytest.mark.integration
class TestTanksAPI:
    """Test tanks CRUD operations"""

    def test_create_tank(self, authenticated_client):
        """Test creating a new tank"""
        response = authenticated_client.post(
            "/api/v1/tanks",
            json={
                "name": "Main Display Tank",
                "display_volume_liters": 200.0,
                "setup_date": str(date.today()),
                "description": "My main reef tank"
            }
        )

        assert response.status_code == 201  # POST creates return 201
        data = response.json()
        assert data["name"] == "Main Display Tank"
        assert data["display_volume_liters"] == 200.0
        assert "id" in data

    def test_list_tanks(self, authenticated_client, test_user, db_session):
        """Test listing user's tanks"""
        # Create some tanks
        from app.models.tank import Tank

        tank1 = Tank(user_id=test_user.id, name="Tank 1", display_volume_liters=100.0)
        tank2 = Tank(user_id=test_user.id, name="Tank 2", display_volume_liters=150.0)
        db_session.add_all([tank1, tank2])
        db_session.commit()

        response = authenticated_client.get("/api/v1/tanks")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] in ["Tank 1", "Tank 2"]

    def test_get_tank_by_id(self, authenticated_client, test_user, db_session):
        """Test getting a specific tank"""
        from app.models.tank import Tank

        tank = Tank(user_id=test_user.id, name="Test Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.get(f"/api/v1/tanks/{tank.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(tank.id)
        assert data["name"] == "Test Tank"

    def test_get_nonexistent_tank(self, authenticated_client):
        """Test getting a tank that doesn't exist"""
        import uuid
        fake_id = str(uuid.uuid4())

        response = authenticated_client.get(f"/api/v1/tanks/{fake_id}")

        assert response.status_code == 404

    def test_update_tank(self, authenticated_client, test_user, db_session):
        """Test updating a tank"""
        from app.models.tank import Tank

        tank = Tank(user_id=test_user.id, name="Old Name", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        response = authenticated_client.put(
            f"/api/v1/tanks/{tank.id}",
            json={
                "name": "New Name",
                "display_volume_liters": 150.0
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "New Name"
        assert data["display_volume_liters"] == 150.0

    def test_delete_tank(self, authenticated_client, test_user, db_session):
        """Test deleting a tank"""
        from app.models.tank import Tank

        tank = Tank(user_id=test_user.id, name="To Delete", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)
        tank_id = tank.id

        response = authenticated_client.delete(f"/api/v1/tanks/{tank_id}")

        assert response.status_code == 204  # DELETE returns 204 No Content

        # Verify tank is deleted
        response = authenticated_client.get(f"/api/v1/tanks/{tank_id}")
        assert response.status_code == 404

    def test_cannot_access_other_users_tank(self, client, db_session, fake):
        """Test that users cannot access other users' tanks"""
        from app.models.user import User
        from app.models.tank import Tank
        from app.core.security import get_password_hash, create_access_token

        # Create two users
        user1 = User(
            email=fake.email(),
            username=fake.user_name(),
            hashed_password=get_password_hash("password123")
        )
        user2 = User(
            email=fake.email(),
            username=fake.user_name(),
            hashed_password=get_password_hash("password123")
        )
        db_session.add_all([user1, user2])
        db_session.commit()
        db_session.refresh(user1)
        db_session.refresh(user2)

        # User1 creates a tank
        tank = Tank(user_id=user1.id, name="User1 Tank", display_volume_liters=100.0)
        db_session.add(tank)
        db_session.commit()
        db_session.refresh(tank)

        # User2 tries to access User1's tank
        user2_token = create_access_token(subject=user2.email)
        client.headers = {"Authorization": f"Bearer {user2_token}"}

        response = client.get(f"/api/v1/tanks/{tank.id}")
        assert response.status_code == 404  # Should not find it (or 401 if endpoint checks ownership)
