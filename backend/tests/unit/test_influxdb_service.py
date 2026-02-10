"""
Tests for InfluxDB service

Uses mocking to test the service layer without a real InfluxDB connection.
"""
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from datetime import datetime


class TestInfluxDBService:
    """Test InfluxDB service with mocked client."""

    @patch("app.services.influxdb.InfluxDBClient")
    def test_write_parameter(self, MockClient):
        """Test writing a single parameter to InfluxDB."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        result = service.write_parameter(
            user_id="user-123",
            tank_id="tank-456",
            parameter_type="calcium",
            value=420.0,
        )

        assert result is True
        mock_write_api.write.assert_called_once()

    @patch("app.services.influxdb.InfluxDBClient")
    def test_write_parameter_with_timestamp(self, MockClient):
        """Test writing a parameter with explicit timestamp."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        ts = datetime(2025, 1, 15, 10, 30, 0)
        result = service.write_parameter(
            user_id="user-123",
            tank_id="tank-456",
            parameter_type="temperature",
            value=25.5,
            timestamp=ts,
        )

        assert result is True
        mock_write_api.write.assert_called_once()

    @patch("app.services.influxdb.InfluxDBClient")
    def test_write_parameter_failure(self, MockClient):
        """Test handling InfluxDB write failure."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_write_api.write.side_effect = Exception("Connection refused")
        mock_query_api = MagicMock()
        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        with pytest.raises(Exception, match="Connection refused"):
            service.write_parameter(
                user_id="user-123",
                tank_id="tank-456",
                parameter_type="calcium",
                value=420.0,
            )

    @patch("app.services.influxdb.InfluxDBClient")
    def test_write_parameters_batch(self, MockClient):
        """Test writing multiple parameters in a batch."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        params = {
            "calcium": 420.0,
            "magnesium": 1350.0,
            "alkalinity_kh": 8.5,
            "temperature": 25.5,
        }

        result = service.write_parameters_batch(
            user_id="user-123",
            tank_id="tank-456",
            parameters=params,
        )

        assert result is True
        mock_write_api.write.assert_called_once()
        # The batch should contain a list of points
        call_args = mock_write_api.write.call_args
        points = call_args.kwargs.get("record") or call_args[1].get("record")
        assert len(points) == 4

    @patch("app.services.influxdb.InfluxDBClient")
    def test_write_parameters_batch_with_timestamp(self, MockClient):
        """Test batch write with explicit timestamp."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        ts = datetime(2025, 3, 10, 14, 0, 0)
        result = service.write_parameters_batch(
            user_id="user-123",
            tank_id="tank-456",
            parameters={"calcium": 415.0},
            timestamp=ts,
        )

        assert result is True

    @patch("app.services.influxdb.InfluxDBClient")
    def test_query_parameters(self, MockClient):
        """Test querying parameters."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()

        # Mock query result
        mock_record = MagicMock()
        mock_record.get_time.return_value = datetime(2025, 1, 15, 10, 30, 0)
        mock_record.get_value.return_value = 420.0
        mock_record.values = {
            "user_id": "user-123",
            "tank_id": "tank-456",
            "parameter_type": "calcium",
        }

        mock_table = MagicMock()
        mock_table.records = [mock_record]
        mock_query_api.query.return_value = [mock_table]

        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        results = service.query_parameters(
            user_id="user-123",
            tank_id="tank-456",
            parameter_type="calcium",
            start="-7d",
        )

        assert len(results) == 1
        assert results[0]["value"] == 420.0
        assert results[0]["parameter_type"] == "calcium"
        assert results[0]["tank_id"] == "tank-456"

    @patch("app.services.influxdb.InfluxDBClient")
    def test_query_parameters_empty(self, MockClient):
        """Test querying when no results found."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_query_api.query.return_value = []

        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        results = service.query_parameters(
            user_id="user-123",
            start="-7d",
        )

        assert results == []

    @patch("app.services.influxdb.InfluxDBClient")
    def test_query_parameters_failure(self, MockClient):
        """Test handling query failure."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_query_api.query.side_effect = Exception("Query timeout")

        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        with pytest.raises(Exception, match="Query timeout"):
            service.query_parameters(user_id="user-123")

    @patch("app.services.influxdb.InfluxDBClient")
    def test_delete_parameter(self, MockClient):
        """Test deleting a specific parameter reading."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_delete_api = MagicMock()
        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        mock_client.delete_api.return_value = mock_delete_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        ts = datetime(2025, 3, 6, 10, 30, 0)
        result = service.delete_parameter(
            user_id="user-123",
            tank_id="tank-456",
            parameter_type="calcium",
            timestamp=ts,
        )

        assert result is True
        mock_delete_api.delete.assert_called_once()

    @patch("app.services.influxdb.InfluxDBClient")
    def test_export_user_parameters(self, MockClient):
        """Test exporting all parameters for a user."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()

        mock_record = MagicMock()
        mock_record.get_time.return_value = datetime(2025, 1, 15, 10, 30, 0)
        mock_record.get_value.return_value = 420.0
        mock_record.values = {
            "tank_id": "tank-456",
            "parameter_type": "calcium",
        }

        mock_table = MagicMock()
        mock_table.records = [mock_record]
        mock_query_api.query.return_value = [mock_table]

        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        results = service.export_user_parameters("user-123")
        assert len(results) == 1
        assert results[0]["value"] == 420.0

    @patch("app.services.influxdb.InfluxDBClient")
    def test_export_user_parameters_failure_returns_empty(self, MockClient):
        """Test that export returns empty list on failure."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_query_api.query.side_effect = Exception("Connection lost")

        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        results = service.export_user_parameters("user-123")
        assert results == []

    @patch("app.services.influxdb.InfluxDBClient")
    def test_export_tank_parameters(self, MockClient):
        """Test exporting all parameters for a specific tank."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()

        mock_record = MagicMock()
        mock_record.get_time.return_value = datetime(2025, 1, 15, 10, 30, 0)
        mock_record.get_value.return_value = 25.5
        mock_record.values = {
            "parameter_type": "temperature",
        }

        mock_table = MagicMock()
        mock_table.records = [mock_record]
        mock_query_api.query.return_value = [mock_table]

        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()

        results = service.export_tank_parameters("user-123", "tank-456")
        assert len(results) == 1
        assert results[0]["parameter_type"] == "temperature"

    @patch("app.services.influxdb.InfluxDBClient")
    def test_close(self, MockClient):
        """Test closing the service."""
        mock_client = MagicMock()
        mock_write_api = MagicMock()
        mock_query_api = MagicMock()
        mock_client.write_api.return_value = mock_write_api
        mock_client.query_api.return_value = mock_query_api
        MockClient.return_value = mock_client

        from app.services.influxdb import InfluxDBService
        service = InfluxDBService()
        service.close()

        mock_client.close.assert_called_once()
