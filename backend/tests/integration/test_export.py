"""
Integration tests for CSV Export API endpoints
"""
import csv
import io
import pytest
from datetime import date, timedelta
from app.models.tank import Tank
from app.models.livestock import Livestock
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
def second_tank(db_session, test_user):
    """Create a second test tank"""
    tank = Tank(
        name="Quarantine Tank",
        display_volume_liters=50,
        sump_volume_liters=0,
        user_id=test_user.id
    )
    db_session.add(tank)
    db_session.commit()
    db_session.refresh(tank)
    return tank


def _parse_csv(response_text: str) -> list[list[str]]:
    """Parse CSV response text into a list of rows."""
    reader = csv.reader(io.StringIO(response_text))
    return list(reader)


class TestExportLivestock:
    """Tests for GET /api/v1/export/livestock"""

    def test_export_livestock_unauthenticated(self, client):
        """Test that unauthenticated requests return 401"""
        response = client.get("/api/v1/export/livestock")
        assert response.status_code == 401

    def test_export_livestock_csv(
        self, authenticated_client, db_session, test_user, test_tank
    ):
        """Test livestock CSV export returns correct headers and data"""
        fish = Livestock(
            tank_id=test_tank.id,
            user_id=test_user.id,
            species_name="Amphiprion ocellaris",
            common_name="Clownfish",
            type="fish",
            quantity=2,
            status="alive",
            added_date=date(2025, 1, 15),
            purchase_price="$50",
            notes="Pair from local store",
        )
        coral = Livestock(
            tank_id=test_tank.id,
            user_id=test_user.id,
            species_name="Acropora millepora",
            common_name="Blue Millepora",
            type="coral",
            quantity=1,
            status="alive",
            added_date=date(2025, 3, 10),
            purchase_price="$35",
            notes="Frag",
        )
        db_session.add_all([fish, coral])
        db_session.commit()

        response = authenticated_client.get("/api/v1/export/livestock")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "attachment" in response.headers["content-disposition"]
        assert "livestock.csv" in response.headers["content-disposition"]

        rows = _parse_csv(response.text)

        # Header row
        assert rows[0] == ["name", "species", "quantity", "date_acquired", "price", "status", "notes"]

        # Data rows (ordered by added_date desc, so coral first)
        assert len(rows) == 3  # header + 2 data rows

        # Find rows by species name
        data_rows = rows[1:]
        species_names = [row[1] for row in data_rows]
        assert "Amphiprion ocellaris" in species_names
        assert "Acropora millepora" in species_names

        # Verify the clownfish row content
        clown_row = next(row for row in data_rows if row[1] == "Amphiprion ocellaris")
        assert clown_row[0] == "Clownfish"           # name (common_name)
        assert clown_row[1] == "Amphiprion ocellaris" # species
        assert clown_row[2] == "2"                    # quantity
        assert clown_row[3] == "2025-01-15"           # date_acquired
        assert clown_row[4] == "$50"                  # price
        assert clown_row[5] == "alive"                # status
        assert clown_row[6] == "Pair from local store" # notes

    def test_export_livestock_by_tank(
        self, authenticated_client, db_session, test_user, test_tank, second_tank
    ):
        """Test livestock CSV export filters by tank_id"""
        # Livestock in first tank
        db_session.add(Livestock(
            tank_id=test_tank.id,
            user_id=test_user.id,
            species_name="Amphiprion ocellaris",
            common_name="Clownfish",
            type="fish",
            added_date=date.today(),
        ))

        # Livestock in second tank
        db_session.add(Livestock(
            tank_id=second_tank.id,
            user_id=test_user.id,
            species_name="Zebrasoma flavescens",
            common_name="Yellow Tang",
            type="fish",
            added_date=date.today(),
        ))
        db_session.commit()

        # Export only first tank
        response = authenticated_client.get(
            f"/api/v1/export/livestock?tank_id={test_tank.id}"
        )
        assert response.status_code == 200

        rows = _parse_csv(response.text)
        data_rows = rows[1:]
        assert len(data_rows) == 1
        assert data_rows[0][0] == "Clownfish"

        # Export only second tank
        response = authenticated_client.get(
            f"/api/v1/export/livestock?tank_id={second_tank.id}"
        )
        assert response.status_code == 200

        rows = _parse_csv(response.text)
        data_rows = rows[1:]
        assert len(data_rows) == 1
        assert data_rows[0][0] == "Yellow Tang"

    def test_export_livestock_empty(self, authenticated_client):
        """Test livestock CSV export with no data returns only headers"""
        response = authenticated_client.get("/api/v1/export/livestock")
        assert response.status_code == 200

        rows = _parse_csv(response.text)
        assert len(rows) == 1  # Only the header row
        assert rows[0] == ["name", "species", "quantity", "date_acquired", "price", "status", "notes"]


class TestExportMaintenance:
    """Tests for GET /api/v1/export/maintenance"""

    def test_export_maintenance_csv(
        self, authenticated_client, db_session, test_user, test_tank
    ):
        """Test maintenance CSV export returns correct headers and data"""
        reminder1 = MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Weekly Water Change",
            description="Change 10% of water",
            reminder_type="water_change",
            frequency_days=7,
            next_due=date(2025, 6, 15),
            last_completed=date(2025, 6, 8),
            is_active=True,
        )
        reminder2 = MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Pump Cleaning",
            description="Clean return pump impeller",
            reminder_type="pump_cleaning",
            frequency_days=30,
            next_due=date(2025, 7, 1),
            last_completed=None,
            is_active=True,
        )
        db_session.add_all([reminder1, reminder2])
        db_session.commit()

        response = authenticated_client.get("/api/v1/export/maintenance")
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "attachment" in response.headers["content-disposition"]
        assert "maintenance.csv" in response.headers["content-disposition"]

        rows = _parse_csv(response.text)

        # Header row
        assert rows[0] == [
            "title", "description", "frequency_days",
            "next_due", "last_completed", "is_active", "reminder_type"
        ]

        # Data rows (ordered by next_due asc, so water change first)
        assert len(rows) == 3  # header + 2 data rows

        # The water change has the earlier next_due, so it comes first
        water_change_row = rows[1]
        assert water_change_row[0] == "Weekly Water Change"
        assert water_change_row[1] == "Change 10% of water"
        assert water_change_row[2] == "7"
        assert water_change_row[3] == "2025-06-15"
        assert water_change_row[4] == "2025-06-08"
        assert water_change_row[5] == "True"
        assert water_change_row[6] == "water_change"

        pump_row = rows[2]
        assert pump_row[0] == "Pump Cleaning"
        assert pump_row[1] == "Clean return pump impeller"
        assert pump_row[2] == "30"
        assert pump_row[3] == "2025-07-01"
        assert pump_row[4] == ""  # last_completed is None
        assert pump_row[5] == "True"
        assert pump_row[6] == "pump_cleaning"

    def test_export_maintenance_by_tank(
        self, authenticated_client, db_session, test_user, test_tank, second_tank
    ):
        """Test maintenance CSV export filters by tank_id"""
        # Reminder in first tank
        db_session.add(MaintenanceReminder(
            tank_id=test_tank.id,
            user_id=test_user.id,
            title="Water Change",
            reminder_type="water_change",
            frequency_days=7,
            next_due=date.today() + timedelta(days=3),
        ))

        # Reminder in second tank
        db_session.add(MaintenanceReminder(
            tank_id=second_tank.id,
            user_id=test_user.id,
            title="Glass Cleaning",
            reminder_type="glass_cleaning",
            frequency_days=3,
            next_due=date.today() + timedelta(days=1),
        ))
        db_session.commit()

        # Export only first tank
        response = authenticated_client.get(
            f"/api/v1/export/maintenance?tank_id={test_tank.id}"
        )
        assert response.status_code == 200

        rows = _parse_csv(response.text)
        data_rows = rows[1:]
        assert len(data_rows) == 1
        assert data_rows[0][0] == "Water Change"

        # Export only second tank
        response = authenticated_client.get(
            f"/api/v1/export/maintenance?tank_id={second_tank.id}"
        )
        assert response.status_code == 200

        rows = _parse_csv(response.text)
        data_rows = rows[1:]
        assert len(data_rows) == 1
        assert data_rows[0][0] == "Glass Cleaning"

    def test_export_maintenance_empty(self, authenticated_client):
        """Test maintenance CSV export with no data returns only headers"""
        response = authenticated_client.get("/api/v1/export/maintenance")
        assert response.status_code == 200

        rows = _parse_csv(response.text)
        assert len(rows) == 1  # Only the header row
        assert rows[0] == [
            "title", "description", "frequency_days",
            "next_due", "last_completed", "is_active", "reminder_type"
        ]


class TestExportInvalidTank:
    """Tests for export endpoints with invalid tank_id"""

    def test_export_livestock_invalid_tank(self, authenticated_client):
        """Test livestock export returns 404 for non-existent tank"""
        response = authenticated_client.get(
            "/api/v1/export/livestock?tank_id=00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    def test_export_maintenance_invalid_tank(self, authenticated_client):
        """Test maintenance export returns 404 for non-existent tank"""
        response = authenticated_client.get(
            "/api/v1/export/maintenance?tank_id=00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    def test_export_maintenance_unauthenticated(self, client):
        """Test that unauthenticated maintenance export returns 401"""
        response = client.get("/api/v1/export/maintenance")
        assert response.status_code == 401
