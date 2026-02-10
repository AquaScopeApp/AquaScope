"""
Unit tests for iNaturalist Service

Tests all methods of INaturalistService with mocked HTTP responses.
Each method creates its own httpx.AsyncClient via `async with`,
so we patch httpx.AsyncClient at the module level and configure
the mock to act as an async context manager.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

import httpx

from app.services.inaturalist import INaturalistService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _mock_response(status_code: int = 200, json_data=None, raise_for_status_error=None):
    """
    Build a mock httpx.Response.

    Args:
        status_code: HTTP status code to return
        json_data: Data returned by response.json()
        raise_for_status_error: If set, raise_for_status() raises this
    """
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data if json_data is not None else {}

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
# search_taxa
# ---------------------------------------------------------------------------

class TestSearchTaxa:
    """Tests for INaturalistService.search_taxa()"""

    def setup_method(self):
        with patch("app.services.inaturalist.settings") as mock_settings:
            mock_settings.INATURALIST_API_URL = "https://api.inaturalist.org/v1"
            self.service = INaturalistService()

    @pytest.mark.asyncio
    async def test_with_results(self):
        """Successful search returns taxa from results key."""
        api_data = {
            "results": [
                {
                    "id": 47691,
                    "name": "Amphiprion ocellaris",
                    "preferred_common_name": "Ocellaris Clownfish",
                    "observations_count": 5000,
                    "default_photo": {
                        "medium_url": "https://photos.url/medium.jpg",
                        "square_url": "https://photos.url/square.jpg",
                    },
                }
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_taxa("Amphiprion ocellaris")

        assert len(results) == 1
        assert results[0]["id"] == 47691
        assert results[0]["preferred_common_name"] == "Ocellaris Clownfish"
        # Verify correct URL and params
        call_args = mock_client.get.call_args
        assert "/taxa" in call_args.args[0]
        params = call_args.kwargs["params"]
        assert params["q"] == "Amphiprion ocellaris"
        assert params["rank"] == "species"
        assert params["is_active"] is True
        assert params["per_page"] == 10

    @pytest.mark.asyncio
    async def test_with_custom_params(self):
        """Custom rank, is_active, and limit are passed through."""
        api_data = {"results": [{"id": 1, "name": "Test"}]}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_taxa(
                "Test", rank="genus", is_active=False, limit=5
            )

        assert len(results) == 1
        params = mock_client.get.call_args.kwargs["params"]
        assert params["rank"] == "genus"
        assert params["is_active"] is False
        assert params["per_page"] == 5

    @pytest.mark.asyncio
    async def test_empty_results(self):
        """No taxa found returns empty list."""
        api_data = {"results": []}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_taxa("xyznotaspecies")

        assert results == []

    @pytest.mark.asyncio
    async def test_missing_results_key(self):
        """Response without 'results' key returns empty list."""
        api_data = {"total_results": 0}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_taxa("anything")

        assert results == []

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
            results = await self.service.search_taxa("Amphiprion ocellaris")

        assert results == []

    @pytest.mark.asyncio
    async def test_connection_error_returns_empty(self):
        """Network-level error returns empty list."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("connection refused"))

        with _patch_async_client(mock_client):
            results = await self.service.search_taxa("Amphiprion ocellaris")

        assert results == []

    @pytest.mark.asyncio
    async def test_unexpected_exception_returns_empty(self):
        """Non-HTTP exceptions are caught by the generic except."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=ValueError("bad data"))

        with _patch_async_client(mock_client):
            results = await self.service.search_taxa("Amphiprion ocellaris")

        assert results == []

    @pytest.mark.asyncio
    async def test_multiple_results(self):
        """Multiple taxa are returned correctly."""
        api_data = {
            "results": [
                {"id": 1, "name": "Amphiprion ocellaris"},
                {"id": 2, "name": "Amphiprion percula"},
                {"id": 3, "name": "Amphiprion clarkii"},
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_taxa("Amphiprion")

        assert len(results) == 3
        assert results[0]["name"] == "Amphiprion ocellaris"
        assert results[2]["name"] == "Amphiprion clarkii"


# ---------------------------------------------------------------------------
# get_taxon
# ---------------------------------------------------------------------------

class TestGetTaxon:
    """Tests for INaturalistService.get_taxon()"""

    def setup_method(self):
        with patch("app.services.inaturalist.settings") as mock_settings:
            mock_settings.INATURALIST_API_URL = "https://api.inaturalist.org/v1"
            self.service = INaturalistService()

    @pytest.mark.asyncio
    async def test_found_taxon(self):
        """Successful fetch returns the first result."""
        api_data = {
            "results": [
                {
                    "id": 47691,
                    "name": "Amphiprion ocellaris",
                    "preferred_common_name": "Ocellaris Clownfish",
                    "rank": "species",
                }
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            result = await self.service.get_taxon("47691")

        assert result is not None
        assert result["id"] == 47691
        assert result["name"] == "Amphiprion ocellaris"
        # Verify correct URL
        call_args = mock_client.get.call_args
        assert "/taxa/47691" in call_args.args[0]

    @pytest.mark.asyncio
    async def test_not_found_empty_results(self):
        """Empty results list returns None."""
        api_data = {"results": []}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            result = await self.service.get_taxon("99999999")

        assert result is None

    @pytest.mark.asyncio
    async def test_missing_results_key(self):
        """Response without 'results' key returns None."""
        api_data = {"error": "not found"}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            result = await self.service.get_taxon("47691")

        assert result is None

    @pytest.mark.asyncio
    async def test_http_error_returns_none(self):
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
            result = await self.service.get_taxon("99999999")

        assert result is None

    @pytest.mark.asyncio
    async def test_connection_error_returns_none(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("timeout"))

        with _patch_async_client(mock_client):
            result = await self.service.get_taxon("47691")

        assert result is None

    @pytest.mark.asyncio
    async def test_unexpected_exception_returns_none(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=RuntimeError("unexpected"))

        with _patch_async_client(mock_client):
            result = await self.service.get_taxon("47691")

        assert result is None


# ---------------------------------------------------------------------------
# get_taxon_photos
# ---------------------------------------------------------------------------

class TestGetTaxonPhotos:
    """Tests for INaturalistService.get_taxon_photos()"""

    def setup_method(self):
        with patch("app.services.inaturalist.settings") as mock_settings:
            mock_settings.INATURALIST_API_URL = "https://api.inaturalist.org/v1"
            self.service = INaturalistService()

    @pytest.mark.asyncio
    async def test_with_photos(self):
        """Observations with photos are extracted correctly."""
        api_data = {
            "results": [
                {
                    "id": 1001,
                    "photos": [
                        {
                            "url": "https://static.inaturalist.org/photos/1/square.jpg",
                            "attribution": "John Doe",
                            "license_code": "cc-by",
                        }
                    ],
                },
                {
                    "id": 1002,
                    "photos": [
                        {
                            "url": "https://static.inaturalist.org/photos/2/square.jpg",
                            "attribution": "Jane Smith",
                            "license_code": "cc-by-nc",
                        }
                    ],
                },
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

        assert len(results) == 2
        assert results[0]["url"] == "https://static.inaturalist.org/photos/1/square.jpg"
        assert results[0]["attribution"] == "John Doe"
        assert results[0]["license_code"] == "cc-by"
        # Verify correct endpoint and params
        call_args = mock_client.get.call_args
        assert "/observations" in call_args.args[0]
        params = call_args.kwargs["params"]
        assert params["taxon_id"] == "47691"
        assert params["photos"] == "true"
        assert params["order_by"] == "votes"

    @pytest.mark.asyncio
    async def test_photo_url_construction_medium(self):
        """medium_url is constructed by replacing /square. with /medium."""
        api_data = {
            "results": [
                {
                    "photos": [
                        {
                            "url": "https://static.inaturalist.org/photos/1/square.jpg",
                            "attribution": "Test",
                            "license_code": "cc0",
                        }
                    ]
                }
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

        assert len(results) == 1
        assert results[0]["medium_url"] == "https://static.inaturalist.org/photos/1/medium.jpg"

    @pytest.mark.asyncio
    async def test_photo_url_none_medium_url_none(self):
        """If photo url is None, medium_url is also None."""
        api_data = {
            "results": [
                {
                    "photos": [
                        {
                            "url": None,
                            "attribution": "Test",
                            "license_code": "cc0",
                        }
                    ]
                }
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

        assert len(results) == 1
        assert results[0]["url"] is None
        assert results[0]["medium_url"] is None

    @pytest.mark.asyncio
    async def test_multiple_photos_per_observation(self):
        """Multiple photos within a single observation are all extracted."""
        api_data = {
            "results": [
                {
                    "photos": [
                        {"url": "https://photos.url/1/square.jpg", "attribution": "A", "license_code": "cc-by"},
                        {"url": "https://photos.url/2/square.jpg", "attribution": "B", "license_code": "cc-by"},
                        {"url": "https://photos.url/3/square.jpg", "attribution": "C", "license_code": "cc-by"},
                    ]
                }
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

        assert len(results) == 3
        assert results[0]["attribution"] == "A"
        assert results[2]["attribution"] == "C"

    @pytest.mark.asyncio
    async def test_limit_applied(self):
        """Results are limited to the requested number of photos."""
        photos_list = [
            {"url": f"https://photos.url/{i}/square.jpg", "attribution": f"User {i}", "license_code": "cc-by"}
            for i in range(20)
        ]
        api_data = {
            "results": [{"photos": photos_list}]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691", limit=5)

        assert len(results) == 5

    @pytest.mark.asyncio
    async def test_empty_observations(self):
        """No observations returns empty list."""
        api_data = {"results": []}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

        assert results == []

    @pytest.mark.asyncio
    async def test_observations_without_photos_key(self):
        """Observations missing 'photos' key are skipped."""
        api_data = {
            "results": [
                {"id": 1001, "description": "No photos here"},
                {"id": 1002},
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

        assert results == []

    @pytest.mark.asyncio
    async def test_observations_with_empty_photos(self):
        """Observations with empty photos list produce no results."""
        api_data = {
            "results": [
                {"id": 1001, "photos": []},
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

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
            results = await self.service.get_taxon_photos("47691")

        assert results == []

    @pytest.mark.asyncio
    async def test_connection_error_returns_empty(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("timeout"))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

        assert results == []

    @pytest.mark.asyncio
    async def test_unexpected_exception_returns_empty(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=RuntimeError("unexpected"))

        with _patch_async_client(mock_client):
            results = await self.service.get_taxon_photos("47691")

        assert results == []


# ---------------------------------------------------------------------------
# search_species (wrapper around search_taxa)
# ---------------------------------------------------------------------------

class TestSearchSpecies:
    """Tests for INaturalistService.search_species()"""

    def setup_method(self):
        with patch("app.services.inaturalist.settings") as mock_settings:
            mock_settings.INATURALIST_API_URL = "https://api.inaturalist.org/v1"
            self.service = INaturalistService()

    @pytest.mark.asyncio
    async def test_delegates_to_search_taxa(self):
        """search_species delegates to search_taxa with rank='species'."""
        api_data = {
            "results": [
                {"id": 47691, "name": "Amphiprion ocellaris"},
            ]
        }
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("clownfish")

        assert len(results) == 1
        assert results[0]["id"] == 47691
        # Verify rank=species was passed
        params = mock_client.get.call_args.kwargs["params"]
        assert params["rank"] == "species"

    @pytest.mark.asyncio
    async def test_custom_limit(self):
        """Limit parameter is forwarded."""
        api_data = {"results": [{"id": i, "name": f"Species {i}"} for i in range(3)]}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("test", limit=3)

        assert len(results) == 3
        params = mock_client.get.call_args.kwargs["params"]
        assert params["per_page"] == 3

    @pytest.mark.asyncio
    async def test_empty_results(self):
        api_data = {"results": []}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, api_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("xyznotaspecies")

        assert results == []

    @pytest.mark.asyncio
    async def test_exception_in_search_taxa_caught(self):
        """If search_taxa raises, search_species catches and returns empty."""
        with patch("app.services.inaturalist.settings") as mock_settings:
            mock_settings.INATURALIST_API_URL = "https://api.inaturalist.org/v1"
            service = INaturalistService()

        with patch.object(
            service, "search_taxa", new_callable=AsyncMock
        ) as mock_taxa:
            mock_taxa.side_effect = Exception("total failure")
            results = await service.search_species("anything")

        assert results == []

    @pytest.mark.asyncio
    async def test_http_error_propagated_through_search_taxa(self):
        """HTTP errors in the underlying search_taxa call are handled."""
        mock_client = AsyncMock()
        error = httpx.HTTPStatusError(
            "Rate Limited",
            request=MagicMock(),
            response=MagicMock(status_code=429),
        )
        mock_client.get = AsyncMock(
            return_value=_mock_response(429, None, raise_for_status_error=error)
        )

        with _patch_async_client(mock_client):
            results = await self.service.search_species("clownfish")

        assert results == []

    @pytest.mark.asyncio
    async def test_returns_same_as_search_taxa(self):
        """search_species returns exactly what search_taxa returns."""
        expected = [
            {"id": 1, "name": "Species A"},
            {"id": 2, "name": "Species B"},
        ]

        with patch("app.services.inaturalist.settings") as mock_settings:
            mock_settings.INATURALIST_API_URL = "https://api.inaturalist.org/v1"
            service = INaturalistService()

        with patch.object(
            service, "search_taxa", new_callable=AsyncMock
        ) as mock_taxa:
            mock_taxa.return_value = expected
            results = await service.search_species("test", limit=5)

        assert results == expected
        mock_taxa.assert_called_once_with("test", rank="species", limit=5)
