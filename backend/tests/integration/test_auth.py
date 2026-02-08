"""
Integration tests for authentication endpoints
"""
import pytest
from app.core.security import get_password_hash


@pytest.mark.integration
class TestAuthEndpoints:
    """Test authentication API endpoints"""

    def test_register_new_user(self, client):
        """Test user registration"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "newuser@example.com",
                "username": "newuser",
                "password": "password123"
            }
        )

        assert response.status_code == 201  # 201 Created is correct for POST
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_register_duplicate_email(self, client, test_user):
        """Test that duplicate email registration fails"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": test_user.email,
                "username": "different_username",
                "password": "password123"
            }
        )

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "not-an-email",
                "username": "testuser",
                "password": "password123"
            }
        )

        assert response.status_code == 422  # Validation error

    def test_register_short_password(self, client):
        """Test registration with too short password"""
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "short"
            }
        )

        assert response.status_code == 422  # 422 Unprocessable Entity for validation errors

    def test_login_success(self, client, db_session):
        """Test successful login"""
        # Create a user with known password
        from app.models.user import User
        user = User(
            email="login@example.com",
            username="loginuser",
            hashed_password=get_password_hash("password123")
        )
        db_session.add(user)
        db_session.commit()

        # Attempt login
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "login@example.com",  # OAuth2 uses 'username' field
                "password": "password123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        """Test login with incorrect password"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": test_user.email,
                "password": "wrongpassword"
            }
        )

        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        response = client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "password123"
            }
        )

        assert response.status_code == 401

    def test_get_current_user(self, authenticated_client, test_user):
        """Test getting current user info"""
        response = authenticated_client.get("/api/v1/auth/me")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_user.id)
        assert data["email"] == test_user.email
        assert "hashed_password" not in data

    def test_get_current_user_unauthenticated(self, client):
        """Test that unauthenticated request fails"""
        response = client.get("/api/v1/auth/me")

        assert response.status_code == 401


@pytest.mark.integration
class TestProtectedEndpoints:
    """Test authentication requirements for protected endpoints"""

    def test_tanks_requires_auth(self, client):
        """Test that tanks endpoint requires authentication"""
        response = client.get("/api/v1/tanks")
        assert response.status_code == 401

    def test_notes_requires_auth(self, client):
        """Test that notes endpoint requires authentication"""
        response = client.get("/api/v1/notes")
        assert response.status_code == 401

    def test_maintenance_requires_auth(self, client):
        """Test that maintenance endpoint requires authentication"""
        response = client.get("/api/v1/maintenance/reminders")
        assert response.status_code == 401
