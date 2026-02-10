"""
Integration tests for Equipment CRUD API endpoints

Equipment belongs to a tank. Covers:
- Full CRUD lifecycle (create, list, get, update, delete)
- Filtering by tank_id, equipment_type, status
- Authentication enforcement (401 without token)
- 404 for non-existent equipment or tanks
- Validation errors for missing required fields
"""
import pytest
from datetime import date

from app.models.tank import Tank
from app.models.equipment import Equipment


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def test_tank(db_session, test_user):
    """Create a test tank for equipment tests"""
    tank = Tank(
        name="Equipment Test Tank",
        display_volume_liters=200,
        sump_volume_liters=50,
        user_id=test_user.id,
    )
    db_session.add(tank)
    db_session.commit()
    db_session.refresh(tank)
    return tank


@pytest.fixture
def test_equipment(db_session, test_user, test_tank):
    """Create a fully-populated test equipment item"""
    equip = Equipment(
        tank_id=test_tank.id,
        user_id=test_user.id,
        name="Return Pump",
        equipment_type="pump",
        manufacturer="Ecotech",
        model="Vectra M2",
        specs={"flow_rate": "1000 GPH", "power": "60W"},
        purchase_date=date.today(),
        purchase_price="$350",
        condition="new",
        status="active",
        notes="Installed on day 1",
    )
    db_session.add(equip)
    db_session.commit()
    db_session.refresh(equip)
    return equip


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestCreateEquipment:
    """POST /api/v1/equipment/"""

    def test_create_equipment_success(self, authenticated_client, test_tank):
        """Create equipment with all fields"""
        response = authenticated_client.post(
            "/api/v1/equipment",
            json={
                "tank_id": str(test_tank.id),
                "name": "Protein Skimmer",
                "equipment_type": "skimmer",
                "manufacturer": "Nyos",
                "model": "Quantum 160",
                "specs": {"air_draw": "600 L/h"},
                "purchase_date": str(date.today()),
                "purchase_price": "$450",
                "condition": "new",
                "status": "active",
                "notes": "Great skimmer",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Protein Skimmer"
        assert data["equipment_type"] == "skimmer"
        assert data["manufacturer"] == "Nyos"
        assert data["model"] == "Quantum 160"
        assert data["specs"] == {"air_draw": "600 L/h"}
        assert data["status"] == "active"
        assert data["tank_id"] == str(test_tank.id)
        assert "id" in data
        assert "user_id" in data
        assert "created_at" in data

    def test_create_equipment_minimal(self, authenticated_client, test_tank):
        """Create equipment with only the required fields (tank_id, name, equipment_type)"""
        response = authenticated_client.post(
            "/api/v1/equipment",
            json={
                "tank_id": str(test_tank.id),
                "name": "Heater",
                "equipment_type": "heater",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Heater"
        assert data["equipment_type"] == "heater"
        assert data["status"] == "active"  # default value
        assert data["manufacturer"] is None
        assert data["model"] is None
        assert data["specs"] is None

    def test_create_equipment_invalid_tank(self, authenticated_client):
        """404 when the referenced tank does not exist"""
        response = authenticated_client.post(
            "/api/v1/equipment",
            json={
                "tank_id": "00000000-0000-0000-0000-000000000000",
                "name": "Heater",
                "equipment_type": "heater",
            },
        )
        assert response.status_code == 404

    def test_create_equipment_missing_required_fields(self, authenticated_client, test_tank):
        """422 when a required field is missing (equipment_type)"""
        response = authenticated_client.post(
            "/api/v1/equipment",
            json={
                "tank_id": str(test_tank.id),
                "name": "Pump",
                # Missing equipment_type
            },
        )
        assert response.status_code == 422

    def test_create_equipment_missing_name(self, authenticated_client, test_tank):
        """422 when name is missing"""
        response = authenticated_client.post(
            "/api/v1/equipment",
            json={
                "tank_id": str(test_tank.id),
                "equipment_type": "pump",
            },
        )
        assert response.status_code == 422

    def test_create_equipment_unauthenticated(self, client, test_tank):
        """401 when creating equipment without a token"""
        response = client.post(
            "/api/v1/equipment",
            json={
                "tank_id": str(test_tank.id),
                "name": "Pump",
                "equipment_type": "pump",
            },
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestListEquipment:
    """GET /api/v1/equipment/"""

    def test_list_all_equipment(self, authenticated_client, test_equipment):
        """List returns at least the seeded equipment item"""
        response = authenticated_client.get("/api/v1/equipment")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(e["name"] == "Return Pump" for e in data)

    def test_list_equipment_by_tank(self, authenticated_client, test_tank, test_equipment):
        """Filter equipment by tank_id query parameter"""
        response = authenticated_client.get(
            f"/api/v1/equipment?tank_id={test_tank.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(e["tank_id"] == str(test_tank.id) for e in data)

    def test_list_equipment_invalid_tank(self, authenticated_client):
        """404 when filtering by a non-existent tank_id"""
        response = authenticated_client.get(
            "/api/v1/equipment?tank_id=00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    def test_list_equipment_by_type(self, authenticated_client, test_equipment):
        """Filter equipment by equipment_type"""
        response = authenticated_client.get("/api/v1/equipment?equipment_type=pump")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(e["equipment_type"] == "pump" for e in data)

    def test_list_equipment_by_status(self, authenticated_client, test_equipment):
        """Filter equipment by status"""
        response = authenticated_client.get("/api/v1/equipment?status=active")

        assert response.status_code == 200
        data = response.json()
        assert all(e["status"] == "active" for e in data)

    def test_list_equipment_combined_filters(
        self, authenticated_client, test_tank, test_equipment
    ):
        """Combine tank_id, equipment_type, and status filters"""
        response = authenticated_client.get(
            f"/api/v1/equipment?tank_id={test_tank.id}&equipment_type=pump&status=active"
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        for e in data:
            assert e["tank_id"] == str(test_tank.id)
            assert e["equipment_type"] == "pump"
            assert e["status"] == "active"

    def test_list_equipment_empty_result(self, authenticated_client, test_equipment):
        """No results when filtering for a type that does not exist"""
        response = authenticated_client.get(
            "/api/v1/equipment?equipment_type=nonexistent_type"
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_list_equipment_unauthenticated(self, client):
        """401 when listing equipment without a token"""
        response = client.get("/api/v1/equipment")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# GET by ID
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestGetEquipment:
    """GET /api/v1/equipment/{equipment_id}"""

    def test_get_equipment_success(self, authenticated_client, test_equipment):
        """Retrieve equipment by its ID"""
        response = authenticated_client.get(
            f"/api/v1/equipment/{test_equipment.id}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_equipment.id)
        assert data["name"] == "Return Pump"
        assert data["manufacturer"] == "Ecotech"
        assert data["model"] == "Vectra M2"

    def test_get_equipment_not_found(self, authenticated_client):
        """404 for a non-existent equipment ID"""
        response = authenticated_client.get(
            "/api/v1/equipment/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    def test_get_equipment_unauthenticated(self, client):
        """401 when getting equipment without a token"""
        response = client.get(
            "/api/v1/equipment/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestUpdateEquipment:
    """PUT /api/v1/equipment/{equipment_id}"""

    def test_update_equipment_success(self, authenticated_client, test_equipment):
        """Update multiple fields at once"""
        response = authenticated_client.put(
            f"/api/v1/equipment/{test_equipment.id}",
            json={
                "name": "Updated Pump",
                "condition": "used",
                "notes": "Running for 6 months",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Pump"
        assert data["condition"] == "used"
        assert data["notes"] == "Running for 6 months"
        # Fields not in the update payload should be unchanged
        assert data["manufacturer"] == "Ecotech"
        assert data["model"] == "Vectra M2"

    def test_update_equipment_partial(self, authenticated_client, test_equipment):
        """Partial update: only change a single field"""
        response = authenticated_client.put(
            f"/api/v1/equipment/{test_equipment.id}",
            json={"status": "stock"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "stock"
        assert data["name"] == "Return Pump"  # unchanged

    def test_update_equipment_specs(self, authenticated_client, test_equipment):
        """Update the specs JSON field"""
        new_specs = {"flow_rate": "1200 GPH", "power": "65W", "noise_level": "low"}
        response = authenticated_client.put(
            f"/api/v1/equipment/{test_equipment.id}",
            json={"specs": new_specs},
        )

        assert response.status_code == 200
        assert response.json()["specs"] == new_specs

    def test_update_equipment_not_found(self, authenticated_client):
        """404 when updating non-existent equipment"""
        response = authenticated_client.put(
            "/api/v1/equipment/00000000-0000-0000-0000-000000000000",
            json={"name": "Test"},
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestDeleteEquipment:
    """DELETE /api/v1/equipment/{equipment_id}"""

    def test_delete_equipment_success(self, authenticated_client, test_equipment):
        """Delete equipment and verify it is gone"""
        equip_id = test_equipment.id

        response = authenticated_client.delete(f"/api/v1/equipment/{equip_id}")
        assert response.status_code == 204

        # Verify deletion
        get_response = authenticated_client.get(f"/api/v1/equipment/{equip_id}")
        assert get_response.status_code == 404

    def test_delete_equipment_not_found(self, authenticated_client):
        """404 when deleting non-existent equipment"""
        response = authenticated_client.delete(
            "/api/v1/equipment/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    def test_delete_equipment_unauthenticated(self, client):
        """401 when deleting equipment without a token"""
        response = client.delete(
            "/api/v1/equipment/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 401
