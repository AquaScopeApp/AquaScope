"""
Pytest configuration and fixtures for AquaScope tests
"""
import pytest
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from faker import Faker

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.core.security import get_password_hash, create_access_token


# Test database setup
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session() -> Generator:
    """Create a fresh database session for each test"""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session) -> Generator:
    """Create a test client with database session override"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def fake() -> Faker:
    """Provide Faker instance for generating test data"""
    return Faker()


@pytest.fixture(scope="function")
def test_user(db_session, fake) -> User:
    """Create a test user in the database"""
    user = User(
        email=fake.email(),
        username=fake.user_name(),
        hashed_password=get_password_hash("testpassword123")
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_user_token(test_user) -> str:
    """Generate an access token for the test user"""
    return create_access_token(subject=test_user.email)


@pytest.fixture(scope="function")
def authenticated_client(client, test_user_token) -> TestClient:
    """Create a test client with authentication header"""
    client.headers = {
        **client.headers,
        "Authorization": f"Bearer {test_user_token}"
    }
    return client


@pytest.fixture(scope="function")
def test_user_credentials() -> dict:
    """Provide standard test user credentials"""
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpassword123"
    }
