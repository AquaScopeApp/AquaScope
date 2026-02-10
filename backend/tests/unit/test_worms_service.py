"""
Unit tests for WoRMS (World Register of Marine Species) Service

Tests all methods of WoRMSService with mocked HTTP responses.
Each method creates its own httpx.AsyncClient via `async with`,
so we patch httpx.AsyncClient at the module level and configure
the mock to act as an async context manager.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

import httpx

from app.services.worms import WoRMSService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_UNSET = object()


def _mock_response(status_code: int = 200, json_data=_UNSET, raise_for_status_error=None):
    """
    Build a mock httpx.Response.

    Args:
        status_code: HTTP status code to return
        json_data: Data returned by response.json()
        raise_for_status_error: If set, raise_for_status() raises this
    """
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data if json_data is not _UNSET else {}

    if raise_for_status_error:
        resp.raise_for_status.side_effect = raise_for_status_error
    else:
        resp.raise_for_status.return_value = None

    return resp


def _patch_async_client(mock_client_instance):
    """
    Patch httpx.AsyncClient so that ``async with httpx.AsyncClient(...) as client:``
    yields *mock_client_instance*.

    Returns a context-manager suitable for use with ``with``.
    """
    ctx = MagicMock()
    ctx.__aenter__ = AsyncMock(return_value=mock_client_instance)
    ctx.__aexit__ = AsyncMock(return_value=False)

    patcher = patch("httpx.AsyncClient", return_value=ctx)
    return patcher


# ---------------------------------------------------------------------------
# search_by_scientific_name
# ---------------------------------------------------------------------------

class TestSearchByScientificName:
    """Tests for WoRMSService.search_by_scientific_name()"""

    def setup_method(self):
        with patch("app.services.worms.settings") as mock_settings:
            mock_settings.WORMS_API_URL = "https://www.marinespecies.org/rest"
            self.service = WoRMSService()

    @pytest.mark.asyncio
    async def test_with_results_list(self):
        """API returns a list of matching records."""
        data = [
            {"AphiaID": 275775, "scientificname": "Amphiprion ocellaris", "status": "accepted"},
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_scientific_name("Amphiprion ocellaris")

        assert len(results) == 1
        assert results[0]["AphiaID"] == 275775
        # Verify correct URL and params
        mock_client.get.assert_called_once()
        call_args = mock_client.get.call_args
        assert "/AphiaRecordsByName/Amphiprion ocellaris" in call_args.args[0]
        assert call_args.kwargs["params"]["marine_only"] is True
        assert call_args.kwargs["params"]["like"] is True

    @pytest.mark.asyncio
    async def test_with_results_single_dict(self):
        """API returns a single dict instead of a list -- wrapped in a list."""
        data = {"AphiaID": 275775, "scientificname": "Amphiprion ocellaris"}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_scientific_name("Amphiprion ocellaris")

        assert len(results) == 1
        assert results[0]["AphiaID"] == 275775

    @pytest.mark.asyncio
    async def test_with_results_none_returns_empty(self):
        """API returns None json -- returns empty list."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, None))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_scientific_name("Nothing")

        assert results == []

    @pytest.mark.asyncio
    async def test_no_results_204(self):
        """HTTP 204 No Content means no matching records."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(204, None))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_scientific_name("Nonexistent species")

        assert results == []

    @pytest.mark.asyncio
    async def test_marine_only_false(self):
        """marine_only parameter is passed through correctly."""
        data = [{"AphiaID": 100, "scientificname": "Freshwater species"}]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_scientific_name(
                "Freshwater species", marine_only=False
            )

        assert len(results) == 1
        call_args = mock_client.get.call_args
        assert call_args.kwargs["params"]["marine_only"] is False

    @pytest.mark.asyncio
    async def test_http_error_returns_empty(self):
        """HTTPError is caught and returns empty list."""
        mock_client = AsyncMock()
        error = httpx.HTTPStatusError(
            "Server Error",
            request=MagicMock(),
            response=MagicMock(status_code=500),
        )
        mock_client.get = AsyncMock(
            return_value=_mock_response(500, None, raise_for_status_error=error)
        )

        with _patch_async_client(mock_client):
            results = await self.service.search_by_scientific_name("Amphiprion ocellaris")

        assert results == []

    @pytest.mark.asyncio
    async def test_unexpected_exception_returns_empty(self):
        """Non-HTTP exceptions are caught by the generic except."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=ValueError("unexpected"))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_scientific_name("Amphiprion ocellaris")

        assert results == []

    @pytest.mark.asyncio
    async def test_connection_error_returns_empty(self):
        """Network-level error returns empty list."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("connection refused"))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_scientific_name("Amphiprion ocellaris")

        assert results == []


# ---------------------------------------------------------------------------
# search_by_common_name
# ---------------------------------------------------------------------------

class TestSearchByCommonName:
    """Tests for WoRMSService.search_by_common_name()"""

    def setup_method(self):
        with patch("app.services.worms.settings") as mock_settings:
            mock_settings.WORMS_API_URL = "https://www.marinespecies.org/rest"
            self.service = WoRMSService()

    @pytest.mark.asyncio
    async def test_with_results_list(self):
        """Successful search returns a list of records."""
        data = [
            {"AphiaID": 275775, "scientificname": "Amphiprion ocellaris", "status": "accepted"},
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_common_name("clownfish")

        assert len(results) == 1
        assert results[0]["AphiaID"] == 275775
        # Verify correct endpoint
        call_args = mock_client.get.call_args
        assert "/AphiaRecordsByVernacular/clownfish" in call_args.args[0]
        assert call_args.kwargs["params"]["like"] is True

    @pytest.mark.asyncio
    async def test_with_single_dict_result(self):
        """Single dict result is wrapped in a list."""
        data = {"AphiaID": 275775, "scientificname": "Amphiprion ocellaris"}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_common_name("clownfish")

        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_none_json_returns_empty(self):
        """None json response returns empty list."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, None))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_common_name("nothing")

        assert results == []

    @pytest.mark.asyncio
    async def test_no_results_204(self):
        """HTTP 204 returns empty list."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(204, None))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_common_name("xyznonexistent")

        assert results == []

    @pytest.mark.asyncio
    async def test_http_error_returns_empty(self):
        mock_client = AsyncMock()
        error = httpx.HTTPStatusError(
            "Server Error",
            request=MagicMock(),
            response=MagicMock(status_code=500),
        )
        mock_client.get = AsyncMock(
            return_value=_mock_response(500, None, raise_for_status_error=error)
        )

        with _patch_async_client(mock_client):
            results = await self.service.search_by_common_name("clownfish")

        assert results == []

    @pytest.mark.asyncio
    async def test_unexpected_exception_returns_empty(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=RuntimeError("something broke"))

        with _patch_async_client(mock_client):
            results = await self.service.search_by_common_name("clownfish")

        assert results == []


# ---------------------------------------------------------------------------
# get_record_by_id
# ---------------------------------------------------------------------------

class TestGetRecordById:
    """Tests for WoRMSService.get_record_by_id()"""

    def setup_method(self):
        with patch("app.services.worms.settings") as mock_settings:
            mock_settings.WORMS_API_URL = "https://www.marinespecies.org/rest"
            self.service = WoRMSService()

    @pytest.mark.asyncio
    async def test_found_record(self):
        data = {
            "AphiaID": 275775,
            "scientificname": "Amphiprion ocellaris",
            "authority": "(Cuvier, 1830)",
            "status": "accepted",
            "rank": "Species",
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            result = await self.service.get_record_by_id("275775")

        assert result is not None
        assert result["AphiaID"] == 275775
        assert result["scientificname"] == "Amphiprion ocellaris"
        # Verify correct URL
        call_args = mock_client.get.call_args
        assert "/AphiaRecordByAphiaID/275775" in call_args.args[0]

    @pytest.mark.asyncio
    async def test_not_found_http_error(self):
        """HTTP 404 returns None."""
        mock_client = AsyncMock()
        error = httpx.HTTPStatusError(
            "Not Found",
            request=MagicMock(),
            response=MagicMock(status_code=404),
        )
        mock_client.get = AsyncMock(
            return_value=_mock_response(404, None, raise_for_status_error=error)
        )

        with _patch_async_client(mock_client):
            result = await self.service.get_record_by_id("99999999")

        assert result is None

    @pytest.mark.asyncio
    async def test_connection_error_returns_none(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("timeout"))

        with _patch_async_client(mock_client):
            result = await self.service.get_record_by_id("275775")

        assert result is None

    @pytest.mark.asyncio
    async def test_unexpected_exception_returns_none(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=TypeError("bad data"))

        with _patch_async_client(mock_client):
            result = await self.service.get_record_by_id("275775")

        assert result is None


# ---------------------------------------------------------------------------
# get_vernacular_names
# ---------------------------------------------------------------------------

class TestGetVernacularNames:
    """Tests for WoRMSService.get_vernacular_names()"""

    def setup_method(self):
        with patch("app.services.worms.settings") as mock_settings:
            mock_settings.WORMS_API_URL = "https://www.marinespecies.org/rest"
            self.service = WoRMSService()

    @pytest.mark.asyncio
    async def test_with_names_list(self):
        data = [
            {"vernacular": "Clownfish", "language": "English"},
            {"vernacular": "Poisson-clown", "language": "French"},
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.get_vernacular_names("275775")

        assert len(results) == 2
        assert results[0]["vernacular"] == "Clownfish"
        # Verify correct endpoint
        call_args = mock_client.get.call_args
        assert "/AphiaVernacularsByAphiaID/275775" in call_args.args[0]

    @pytest.mark.asyncio
    async def test_with_single_dict_result(self):
        """Single dict is wrapped in a list."""
        data = {"vernacular": "Clownfish", "language": "English"}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.get_vernacular_names("275775")

        assert len(results) == 1
        assert results[0]["vernacular"] == "Clownfish"

    @pytest.mark.asyncio
    async def test_none_json_returns_empty(self):
        """None json returns empty list."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, None))

        with _patch_async_client(mock_client):
            results = await self.service.get_vernacular_names("275775")

        assert results == []

    @pytest.mark.asyncio
    async def test_empty_list(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, []))

        with _patch_async_client(mock_client):
            results = await self.service.get_vernacular_names("275775")

        assert results == []

    @pytest.mark.asyncio
    async def test_http_error_returns_empty(self):
        mock_client = AsyncMock()
        error = httpx.HTTPStatusError(
            "Server Error",
            request=MagicMock(),
            response=MagicMock(status_code=500),
        )
        mock_client.get = AsyncMock(
            return_value=_mock_response(500, None, raise_for_status_error=error)
        )

        with _patch_async_client(mock_client):
            results = await self.service.get_vernacular_names("275775")

        assert results == []

    @pytest.mark.asyncio
    async def test_unexpected_exception_returns_empty(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=KeyError("oops"))

        with _patch_async_client(mock_client):
            results = await self.service.get_vernacular_names("275775")

        assert results == []


# ---------------------------------------------------------------------------
# search_species (unified search)
# ---------------------------------------------------------------------------

class TestSearchSpecies:
    """Tests for WoRMSService.search_species() -- unified search"""

    def setup_method(self):
        with patch("app.services.worms.settings") as mock_settings:
            mock_settings.WORMS_API_URL = "https://www.marinespecies.org/rest"
            self.service = WoRMSService()

    @pytest.mark.asyncio
    async def test_scientific_name_found_returns_accepted(self):
        """When scientific name search finds accepted records, they are returned."""
        data = [
            {"AphiaID": 275775, "scientificname": "Amphiprion ocellaris", "status": "accepted"},
            {"AphiaID": 999, "scientificname": "Amphiprion sp.", "status": "unaccepted"},
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("Amphiprion ocellaris")

        # Only the accepted one
        assert len(results) == 1
        assert results[0]["AphiaID"] == 275775

    @pytest.mark.asyncio
    async def test_falls_back_to_common_name(self):
        """If scientific name returns empty, common name search is tried."""
        scientific_response = _mock_response(204, None)
        common_response = _mock_response(200, [
            {"AphiaID": 275775, "scientificname": "Amphiprion ocellaris", "status": "accepted"},
        ])

        mock_client = AsyncMock()
        call_count = 0

        async def mock_get(url, **kwargs):
            nonlocal call_count
            call_count += 1
            if "/AphiaRecordsByName/" in url:
                return scientific_response
            if "/AphiaRecordsByVernacular/" in url:
                return common_response
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_species("clownfish")

        assert len(results) == 1
        assert results[0]["AphiaID"] == 275775

    @pytest.mark.asyncio
    async def test_no_accepted_returns_all_limited(self):
        """When no records have status=accepted, all results are returned (limited)."""
        data = [
            {"AphiaID": 1, "scientificname": "Species A", "status": "unaccepted"},
            {"AphiaID": 2, "scientificname": "Species B", "status": "synonym"},
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("Species A", limit=5)

        assert len(results) == 2
        assert results[0]["AphiaID"] == 1

    @pytest.mark.asyncio
    async def test_limit_applied(self):
        """Results are limited to the specified count."""
        data = [
            {"AphiaID": i, "scientificname": f"Species {i}", "status": "accepted"}
            for i in range(20)
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("Species", limit=5)

        assert len(results) == 5

    @pytest.mark.asyncio
    async def test_both_searches_empty(self):
        """When both scientific and common name return nothing, empty list."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(204, None))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("xyznotaspecies")

        assert results == []

    @pytest.mark.asyncio
    async def test_exception_returns_empty(self):
        """Top-level exception in search_species returns empty list."""
        # We mock search_by_scientific_name to raise an exception
        with patch("app.services.worms.settings") as mock_settings:
            mock_settings.WORMS_API_URL = "https://www.marinespecies.org/rest"
            service = WoRMSService()

        with patch.object(
            service, "search_by_scientific_name", new_callable=AsyncMock
        ) as mock_sci:
            mock_sci.side_effect = Exception("total failure")
            results = await service.search_species("anything")

        assert results == []

    @pytest.mark.asyncio
    async def test_mixed_accepted_and_unaccepted(self):
        """Accepted records are prioritized; unaccepted are excluded when accepted exist."""
        data = [
            {"AphiaID": 1, "scientificname": "Accepted sp.", "status": "accepted"},
            {"AphiaID": 2, "scientificname": "Synonym sp.", "status": "synonym"},
            {"AphiaID": 3, "scientificname": "Another accepted", "status": "accepted"},
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("test", limit=10)

        assert len(results) == 2
        assert all(r["status"] == "accepted" for r in results)
