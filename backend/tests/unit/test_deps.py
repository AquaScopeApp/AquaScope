"""
Tests for API dependencies (auth middleware)

Tests the dependency injection functions for authentication.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException

from app.api.deps import get_current_user, get_current_active_user, get_current_admin_user
from app.core.security import create_access_token


class TestGetCurrentUser:
    """Test the get_current_user dependency."""

    @pytest.mark.asyncio
    async def test_valid_token_returns_user(self, db_session, test_user):
        """Valid JWT should return the corresponding user."""
        token = create_access_token(subject=test_user.email)
        user = await get_current_user(token=token, db=db_session)
        assert user.id == test_user.id
        assert user.email == test_user.email

    @pytest.mark.asyncio
    async def test_invalid_token_raises_401(self, db_session):
        """Invalid JWT should raise 401."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token="invalid-token", db=db_session)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_expired_token_raises_401(self, db_session, test_user):
        """Expired JWT should raise 401."""
        from datetime import timedelta
        token = create_access_token(
            subject=test_user.email,
            expires_delta=timedelta(seconds=-1)
        )
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=token, db=db_session)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_token_for_nonexistent_user_raises_401(self, db_session):
        """Token for a user not in DB should raise 401."""
        token = create_access_token(subject="nonexistent@example.com")
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token=token, db=db_session)
        assert exc_info.value.status_code == 401


class TestGetCurrentActiveUser:
    """Test the get_current_active_user dependency."""

    @pytest.mark.asyncio
    async def test_returns_user(self, test_user):
        """Should pass through the current user."""
        user = await get_current_active_user(current_user=test_user)
        assert user.id == test_user.id


class TestGetCurrentAdminUser:
    """Test the get_current_admin_user dependency."""

    @pytest.mark.asyncio
    async def test_admin_user_passes(self, db_session, fake):
        """Admin user should be returned."""
        from app.models.user import User
        from app.core.security import get_password_hash

        admin = User(
            email=fake.email(),
            username=fake.user_name(),
            hashed_password=get_password_hash("password123"),
            is_admin=True,
        )
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)

        result = await get_current_admin_user(current_user=admin)
        assert result.id == admin.id

    @pytest.mark.asyncio
    async def test_non_admin_raises_403(self, test_user):
        """Non-admin user should raise 403."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_admin_user(current_user=test_user)
        assert exc_info.value.status_code == 403
        assert "Admin privileges" in exc_info.value.detail
