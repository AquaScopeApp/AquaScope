"""
Integration tests for Livestock endpoints
"""
import pytest
from datetime import date, timedelta
from app.models.tank import Tank
from app.models.livestock import Livestock


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
def test_fish(db_session, test_user, test_tank):
    """Create a test fish"""
    fish = Livestock(
        tank_id=test_tank.id,
        user_id=test_user.id,
        species_name="Amphiprion ocellaris",
        common_name="Clownfish",
        type="fish",
        fishbase_species_id="123",
        added_date=date.today() - timedelta(days=30),
        notes="Very active, eats well"
    )
    db_session.add(fish)
    db_session.commit()
    db_session.refresh(fish)
    return fish


@pytest.fixture
def test_coral(db_session, test_user, test_tank):
    """Create a test coral"""
    coral = Livestock(
        tank_id=test_tank.id,
        user_id=test_user.id,
        species_name="Acropora millepora",
        common_name="Blue SPS Coral",
        type="coral",
        added_date=date.today() - timedelta(days=60),
        notes="Growing well, good polyp extension"
    )
    db_session.add(coral)
    db_session.commit()
    db_session.refresh(coral)
    return coral


class TestCreateLivestock:
    """Tests for creating livestock"""

    def test_create_fish_success(self, authenticated_client, test_tank):
        """Test successful fish creation"""
        response = authenticated_client.post(
            "/api/v1/livestock",
            json={
                "tank_id": str(test_tank.id),
                "species_name": "Zebrasoma flavescens",
                "common_name": "Yellow Tang",
                "type": "fish",
                "fishbase_species_id": "456",
                "added_date": str(date.today()),
                "notes": "Beautiful yellow color"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["species_name"] == "Zebrasoma flavescens"
        assert data["common_name"] == "Yellow Tang"
        assert data["type"] == "fish"
        assert data["fishbase_species_id"] == "456"

    def test_create_coral_success(self, authenticated_client, test_tank):
        """Test successful coral creation"""
        response = authenticated_client.post(
            "/api/v1/livestock",
            json={
                "tank_id": str(test_tank.id),
                "species_name": "Stylophora pistillata",
                "common_name": "Pink Stylophora",
                "type": "coral",
                "added_date": str(date.today())
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "coral"
        assert data["species_name"] == "Stylophora pistillata"

    def test_create_invertebrate_success(self, authenticated_client, test_tank):
        """Test successful invertebrate creation"""
        response = authenticated_client.post(
            "/api/v1/livestock",
            json={
                "tank_id": str(test_tank.id),
                "species_name": "Lysmata amboinensis",
                "common_name": "Cleaner Shrimp",
                "type": "invertebrate",
                "added_date": str(date.today())
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "invertebrate"

    def test_create_livestock_invalid_tank(self, authenticated_client):
        """Test livestock creation with non-existent tank"""
        response = authenticated_client.post(
            "/api/v1/livestock",
            json={
                "tank_id": "00000000-0000-0000-0000-000000000000",
                "species_name": "Test",
                "common_name": "Test",
                "type": "fish",
                "added_date": str(date.today())
            }
        )
        assert response.status_code == 404

    def test_create_livestock_missing_fields(self, authenticated_client, test_tank):
        """Test livestock creation with missing required fields"""
        response = authenticated_client.post(
            "/api/v1/livestock",
            json={
                "tank_id": str(test_tank.id),
                "species_name": "Test"
                # Missing required fields
            }
        )
        assert response.status_code == 422

    def test_create_livestock_unauthorized(self, client, test_tank):
        """Test livestock creation without authentication"""
        response = client.post(
            "/api/v1/livestock",
            json={
                "tank_id": str(test_tank.id),
                "species_name": "Test",
                "common_name": "Test",
                "type": "fish",
                "added_date": str(date.today())
            }
        )
        assert response.status_code == 401


class TestListLivestock:
    """Tests for listing livestock"""

    def test_list_all_livestock(self, authenticated_client, test_fish, test_coral):
        """Test listing all livestock"""
        response = authenticated_client.get("/api/v1/livestock")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    def test_list_livestock_by_tank(self, authenticated_client, test_tank, test_fish):
        """Test filtering livestock by tank"""
        response = authenticated_client.get(
            f"/api/v1/livestock?tank_id={test_tank.id}"
        )
        assert response.status_code == 200
        data = response.json()
        assert all(l["tank_id"] == str(test_tank.id) for l in data)

    def test_list_livestock_by_type(self, authenticated_client, test_fish, test_coral):
        """Test filtering livestock by type"""
        response = authenticated_client.get("/api/v1/livestock?type=fish")
        assert response.status_code == 200
        data = response.json()
        assert all(l["type"] == "fish" for l in data)
        assert len(data) >= 1

    def test_list_livestock_combined_filters(self, authenticated_client, test_tank, test_fish):
        """Test combining tank and type filters"""
        response = authenticated_client.get(
            f"/api/v1/livestock?tank_id={test_tank.id}&type=fish"
        )
        assert response.status_code == 200
        data = response.json()
        assert all(l["tank_id"] == str(test_tank.id) and l["type"] == "fish" for l in data)


class TestGetLivestock:
    """Tests for getting specific livestock"""

    def test_get_livestock_success(self, authenticated_client, test_fish):
        """Test successful livestock retrieval"""
        response = authenticated_client.get(f"/api/v1/livestock/{test_fish.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_fish.id)
        assert data["species_name"] == test_fish.species_name

    def test_get_livestock_not_found(self, authenticated_client):
        """Test getting non-existent livestock"""
        response = authenticated_client.get(
            "/api/v1/livestock/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


class TestUpdateLivestock:
    """Tests for updating livestock"""

    def test_update_livestock_success(self, authenticated_client, test_fish):
        """Test successful livestock update"""
        response = authenticated_client.put(
            f"/api/v1/livestock/{test_fish.id}",
            json={
                "common_name": "Updated Clownfish",
                "notes": "Updated notes"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["common_name"] == "Updated Clownfish"
        assert data["notes"] == "Updated notes"

    def test_update_livestock_partial(self, authenticated_client, test_fish):
        """Test partial livestock update"""
        response = authenticated_client.put(
            f"/api/v1/livestock/{test_fish.id}",
            json={"notes": "Only updating notes"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Only updating notes"
        assert data["species_name"] == test_fish.species_name  # Unchanged

    def test_update_livestock_not_found(self, authenticated_client):
        """Test updating non-existent livestock"""
        response = authenticated_client.put(
            "/api/v1/livestock/00000000-0000-0000-0000-000000000000",
            json={"notes": "Test"}
        )
        assert response.status_code == 404


class TestDeleteLivestock:
    """Tests for deleting livestock"""

    def test_delete_livestock_success(self, authenticated_client, test_fish):
        """Test successful livestock deletion"""
        livestock_id = test_fish.id
        response = authenticated_client.delete(f"/api/v1/livestock/{livestock_id}")
        assert response.status_code == 204

        # Verify deletion
        get_response = authenticated_client.get(f"/api/v1/livestock/{livestock_id}")
        assert get_response.status_code == 404

    def test_delete_livestock_not_found(self, authenticated_client):
        """Test deleting non-existent livestock"""
        response = authenticated_client.delete(
            "/api/v1/livestock/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


class TestFishBaseSearch:
    """Tests for FishBase API search"""

    def test_fishbase_search_endpoint(self, authenticated_client):
        """Test FishBase search endpoint exists"""
        response = authenticated_client.get(
            "/api/v1/livestock/fishbase/search?q=clownfish"
        )
        # Note: This will fail in CI without actual FishBase API access
        # Should mock in production tests
        assert response.status_code in [200, 503]  # 503 if FishBase is unavailable
