"""
Unit tests for FishBase Service

Tests all methods of FishBaseService with mocked HTTP responses.
Each method creates its own httpx.AsyncClient via `async with`,
so we patch httpx.AsyncClient at the module level and configure
the mock to act as an async context manager.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock

import httpx

from app.services.fishbase import FishBaseService


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
    # The constructor returns an object that supports __aenter__ / __aexit__
    ctx = MagicMock()
    ctx.__aenter__ = AsyncMock(return_value=mock_client_instance)
    ctx.__aexit__ = AsyncMock(return_value=False)

    patcher = patch("httpx.AsyncClient", return_value=ctx)
    return patcher


# ---------------------------------------------------------------------------
# clean_species_name  (synchronous, no mocking needed)
# ---------------------------------------------------------------------------

class TestCleanSpeciesName:
    """Tests for FishBaseService.clean_species_name()"""

    def setup_method(self):
        with patch("app.services.fishbase.settings") as mock_settings:
            mock_settings.FISHBASE_API_URL = "https://fishbase.ropensci.org"
            self.service = FishBaseService()

    def test_removes_trailing_numbers(self):
        result = self.service.clean_species_name("Amphiprion ocellaris 5606")
        assert result == "Amphiprion ocellaris"

    def test_removes_trailing_numbers_with_extra_spaces(self):
        result = self.service.clean_species_name("Zebrasoma flavescens  123")
        assert result == "Zebrasoma flavescens"

    def test_handles_clean_name_no_change(self):
        result = self.service.clean_species_name("Amphiprion ocellaris")
        assert result == "Amphiprion ocellaris"

    def test_strips_leading_trailing_whitespace(self):
        result = self.service.clean_species_name("  Amphiprion ocellaris  ")
        assert result == "Amphiprion ocellaris"

    def test_collapses_internal_whitespace(self):
        result = self.service.clean_species_name("Amphiprion   ocellaris")
        assert result == "Amphiprion ocellaris"

    def test_single_word_with_trailing_number(self):
        result = self.service.clean_species_name("Clownfish 42")
        assert result == "Clownfish"

    def test_single_word_no_number(self):
        result = self.service.clean_species_name("Clownfish")
        assert result == "Clownfish"

    def test_empty_string(self):
        result = self.service.clean_species_name("")
        assert result == ""


# ---------------------------------------------------------------------------
# search_species
# ---------------------------------------------------------------------------

class TestSearchSpecies:
    """Tests for FishBaseService.search_species()"""

    def setup_method(self):
        with patch("app.services.fishbase.settings") as mock_settings:
            mock_settings.FISHBASE_API_URL = "https://fishbase.ropensci.org"
            self.service = FishBaseService()

    @pytest.mark.asyncio
    async def test_search_scientific_name_returns_list(self):
        """Two-part query hits the genus/species endpoint and returns a list."""
        species_data = [
            {"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris"}
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, species_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("Amphiprion ocellaris")

        assert len(results) == 1
        assert results[0]["SpecCode"] == 5606
        # First call should be to /species with Genus & Species params
        first_call = mock_client.get.call_args_list[0]
        assert "/species" in first_call.args[0]

    @pytest.mark.asyncio
    async def test_search_scientific_name_dict_response(self):
        """When the API returns a single dict instead of a list, it is wrapped."""
        species_data = {"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris"}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, species_data))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("Amphiprion ocellaris")

        assert len(results) == 1
        assert results[0]["SpecCode"] == 5606

    @pytest.mark.asyncio
    async def test_search_falls_back_to_common_name(self):
        """Single-word query skips genus/species and goes straight to comnames."""
        comnames_data = [{"SpecCode": 5606, "ComName": "Clownfish"}]
        species_detail = [{"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris"}]

        mock_client = AsyncMock()

        async def mock_get(url, **kwargs):
            if "/comnames" in url:
                return _mock_response(200, comnames_data)
            if "/species/5606" in url:
                return _mock_response(200, species_detail)
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_species("clownfish")

        assert len(results) == 1
        assert results[0]["SpecCode"] == 5606

    @pytest.mark.asyncio
    async def test_search_common_name_species_detail_dict(self):
        """When species detail returns a dict (not list), it is appended directly."""
        comnames_data = [{"SpecCode": 100, "ComName": "Nemo"}]
        species_dict = {"SpecCode": 100, "Genus": "Amphiprion", "Species": "percula"}

        mock_client = AsyncMock()

        async def mock_get(url, **kwargs):
            if "/comnames" in url:
                return _mock_response(200, comnames_data)
            if "/species/100" in url:
                return _mock_response(200, species_dict)
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_species("nemo")

        assert len(results) == 1
        assert results[0]["SpecCode"] == 100

    @pytest.mark.asyncio
    async def test_search_empty_results(self):
        """When all endpoints return empty, an empty list is returned."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, []))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("nonexistentfish")

        assert results == []

    @pytest.mark.asyncio
    async def test_search_api_error_returns_empty(self):
        """Outer exception is caught and returns an empty list."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("connection failed"))

        with _patch_async_client(mock_client):
            results = await self.service.search_species("Amphiprion ocellaris")

        assert results == []

    @pytest.mark.asyncio
    async def test_search_scientific_404_falls_back(self):
        """If genus/species endpoint returns 404, falls back to comnames."""
        comnames_data = [{"SpecCode": 5606, "ComName": "Clownfish"}]
        species_detail = [{"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris"}]

        mock_client = AsyncMock()

        async def mock_get(url, **kwargs):
            params = kwargs.get("params", {})
            if "/species" in url and "Genus" in params:
                return _mock_response(404, None)
            if "/comnames" in url:
                return _mock_response(200, comnames_data)
            if "/species/5606" in url:
                return _mock_response(200, species_detail)
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_species("Amphiprion ocellaris")

        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_search_comnames_not_a_list(self):
        """If comnames returns something other than a list, no results are appended."""
        mock_client = AsyncMock()

        async def mock_get(url, **kwargs):
            if "/comnames" in url:
                return _mock_response(200, {"error": "not found"})
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_species("unknownfish")

        assert results == []


# ---------------------------------------------------------------------------
# get_species_by_id
# ---------------------------------------------------------------------------

class TestGetSpeciesById:
    """Tests for FishBaseService.get_species_by_id()"""

    def setup_method(self):
        with patch("app.services.fishbase.settings") as mock_settings:
            mock_settings.FISHBASE_API_URL = "https://fishbase.ropensci.org"
            self.service = FishBaseService()

    @pytest.mark.asyncio
    async def test_found_species_list_response(self):
        """API returns a list -- first element is returned."""
        data = [{"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris"}]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            result = await self.service.get_species_by_id("5606")

        assert result is not None
        assert result["SpecCode"] == 5606

    @pytest.mark.asyncio
    async def test_found_species_dict_response(self):
        """API returns a single dict -- returned as-is."""
        data = {"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris"}
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            result = await self.service.get_species_by_id("5606")

        assert result is not None
        assert result["SpecCode"] == 5606

    @pytest.mark.asyncio
    async def test_found_species_empty_list(self):
        """API returns an empty list -- returns the empty list (truthy check on caller)."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, []))

        with _patch_async_client(mock_client):
            result = await self.service.get_species_by_id("99999")

        # isinstance([], list) and len([]) == 0 -> returns [] itself
        assert result == []

    @pytest.mark.asyncio
    async def test_not_found_http_error(self):
        """HTTP error (e.g. 404) returns None."""
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
            result = await self.service.get_species_by_id("99999")

        assert result is None

    @pytest.mark.asyncio
    async def test_connection_error_returns_none(self):
        """Network-level error returns None."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=httpx.ConnectError("timeout"))

        with _patch_async_client(mock_client):
            result = await self.service.get_species_by_id("5606")

        assert result is None


# ---------------------------------------------------------------------------
# get_common_names
# ---------------------------------------------------------------------------

class TestGetCommonNames:
    """Tests for FishBaseService.get_common_names()"""

    def setup_method(self):
        with patch("app.services.fishbase.settings") as mock_settings:
            mock_settings.FISHBASE_API_URL = "https://fishbase.ropensci.org"
            self.service = FishBaseService()

    @pytest.mark.asyncio
    async def test_with_results(self):
        data = [
            {"ComName": "Clownfish", "Language": "English", "Country": "USA"},
            {"ComName": "Poisson-clown", "Language": "French", "Country": "France"},
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, data))

        with _patch_async_client(mock_client):
            results = await self.service.get_common_names("5606")

        assert len(results) == 2
        assert results[0]["ComName"] == "Clownfish"

    @pytest.mark.asyncio
    async def test_empty_results(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, []))

        with _patch_async_client(mock_client):
            results = await self.service.get_common_names("99999")

        assert results == []

    @pytest.mark.asyncio
    async def test_non_list_response_returns_empty(self):
        """If the API returns a dict or None, an empty list is returned."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, {"error": "none"}))

        with _patch_async_client(mock_client):
            results = await self.service.get_common_names("5606")

        assert results == []

    @pytest.mark.asyncio
    async def test_api_error_returns_empty(self):
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
            results = await self.service.get_common_names("5606")

        assert results == []


# ---------------------------------------------------------------------------
# get_species_images
# ---------------------------------------------------------------------------

class TestGetSpeciesImages:
    """Tests for FishBaseService.get_species_images()"""

    def setup_method(self):
        with patch("app.services.fishbase.settings") as mock_settings:
            mock_settings.FISHBASE_API_URL = "https://fishbase.ropensci.org"
            self.service = FishBaseService()

    @pytest.mark.asyncio
    async def test_with_photos_no_existing_urls(self):
        """Photos without Pic/ThumbPic get URLs constructed."""
        photos = [
            {"PicName": "amphiprion_ocellaris_01.jpg", "SpecCode": 5606}
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, photos))

        with _patch_async_client(mock_client):
            results = await self.service.get_species_images("5606")

        assert len(results) == 1
        assert results[0]["Pic"] == "https://www.fishbase.se/images/species/amphiprion_ocellaris_01.jpg"
        assert results[0]["ThumbPic"] == "https://www.fishbase.se/images/thumbnails/tn_amphiprion_ocellaris_01.jpg"

    @pytest.mark.asyncio
    async def test_with_photos_existing_urls_preserved(self):
        """Photos that already have Pic/ThumbPic keep their existing URLs."""
        photos = [
            {
                "PicName": "amphiprion_ocellaris_01.jpg",
                "SpecCode": 5606,
                "Pic": "https://existing.url/pic.jpg",
                "ThumbPic": "https://existing.url/thumb.jpg",
            }
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, photos))

        with _patch_async_client(mock_client):
            results = await self.service.get_species_images("5606")

        assert results[0]["Pic"] == "https://existing.url/pic.jpg"
        assert results[0]["ThumbPic"] == "https://existing.url/thumb.jpg"

    @pytest.mark.asyncio
    async def test_with_photos_pic_exists_thumb_missing(self):
        """If Pic exists but ThumbPic is missing, thumb is constructed."""
        photos = [
            {
                "PicName": "zebrasoma_flavescens.jpg",
                "SpecCode": 100,
                "Pic": "https://existing.url/pic.jpg",
            }
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, photos))

        with _patch_async_client(mock_client):
            results = await self.service.get_species_images("100")

        assert results[0]["Pic"] == "https://existing.url/pic.jpg"
        assert results[0]["ThumbPic"] == "https://www.fishbase.se/images/thumbnails/tn_zebrasoma_flavescens.jpg"

    @pytest.mark.asyncio
    async def test_empty_photos(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, []))

        with _patch_async_client(mock_client):
            results = await self.service.get_species_images("5606")

        assert results == []

    @pytest.mark.asyncio
    async def test_non_list_response_returns_empty(self):
        """If the API returns something other than a list, empty is returned."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, {"error": "nope"}))

        with _patch_async_client(mock_client):
            results = await self.service.get_species_images("5606")

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
            results = await self.service.get_species_images("5606")

        assert results == []

    @pytest.mark.asyncio
    async def test_unexpected_exception_returns_empty(self):
        """Non-HTTP exceptions are caught by the generic except."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(side_effect=ValueError("unexpected"))

        with _patch_async_client(mock_client):
            results = await self.service.get_species_images("5606")

        assert results == []

    @pytest.mark.asyncio
    async def test_photo_without_picname_skips_url_construction(self):
        """Photos missing PicName are returned but URLs are not constructed."""
        photos = [{"SpecCode": 5606, "autoctr": 1234}]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, photos))

        with _patch_async_client(mock_client):
            results = await self.service.get_species_images("5606")

        assert len(results) == 1
        assert "Pic" not in results[0]
        assert "ThumbPic" not in results[0]


# ---------------------------------------------------------------------------
# get_primary_image
# ---------------------------------------------------------------------------

class TestGetPrimaryImage:
    """Tests for FishBaseService.get_primary_image()"""

    def setup_method(self):
        with patch("app.services.fishbase.settings") as mock_settings:
            mock_settings.FISHBASE_API_URL = "https://fishbase.ropensci.org"
            self.service = FishBaseService()

    @pytest.mark.asyncio
    async def test_with_images_returns_thumb(self):
        """Returns ThumbPic of the first image."""
        photos = [
            {
                "PicName": "amphiprion_ocellaris_01.jpg",
                "ThumbPic": "https://thumb.url/tn.jpg",
                "Pic": "https://full.url/pic.jpg",
            }
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, photos))

        with _patch_async_client(mock_client):
            result = await self.service.get_primary_image("5606")

        assert result == "https://thumb.url/tn.jpg"

    @pytest.mark.asyncio
    async def test_with_images_falls_back_to_pic(self):
        """If ThumbPic is missing, falls back to Pic."""
        photos = [
            {
                "PicName": "amphiprion_ocellaris_01.jpg",
                "Pic": "https://full.url/pic.jpg",
            }
        ]
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, photos))

        with _patch_async_client(mock_client):
            result = await self.service.get_primary_image("5606")

        # get_species_images constructs ThumbPic when missing, so it should exist
        assert result is not None

    @pytest.mark.asyncio
    async def test_no_images_returns_none(self):
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, []))

        with _patch_async_client(mock_client):
            result = await self.service.get_primary_image("5606")

        assert result is None


# ---------------------------------------------------------------------------
# search_with_details
# ---------------------------------------------------------------------------

class TestSearchWithDetails:
    """Tests for FishBaseService.search_with_details()"""

    def setup_method(self):
        with patch("app.services.fishbase.settings") as mock_settings:
            mock_settings.FISHBASE_API_URL = "https://fishbase.ropensci.org"
            self.service = FishBaseService()

    @pytest.mark.asyncio
    async def test_combined_search_without_images(self):
        """search_with_details enriches species from search_species."""
        search_data = [{"SpecCode": 5606, "Genus": "Amphiprion"}]
        detail_data = [{"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris", "Length": 11.0}]

        mock_client = AsyncMock()

        async def mock_get(url, **kwargs):
            if "/species" in url and "Genus" in kwargs.get("params", {}):
                return _mock_response(200, search_data)
            if "/species/5606" in url:
                return _mock_response(200, detail_data)
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_with_details(
                "Amphiprion ocellaris", include_images=False
            )

        assert len(results) == 1
        assert results[0]["Length"] == 11.0
        assert "thumbnail" not in results[0]

    @pytest.mark.asyncio
    async def test_combined_search_with_images(self):
        """When include_images=True, a thumbnail is added."""
        search_data = [{"SpecCode": 5606, "Genus": "Amphiprion"}]
        detail_data = [{"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris"}]
        photos_data = [
            {
                "PicName": "amphiprion_ocellaris_01.jpg",
                "ThumbPic": "https://thumb.url/tn.jpg",
                "Pic": "https://full.url/pic.jpg",
            }
        ]

        mock_client = AsyncMock()

        async def mock_get(url, **kwargs):
            params = kwargs.get("params", {})
            if "/photos" in url:
                return _mock_response(200, photos_data)
            if "/species" in url and "Genus" in params:
                return _mock_response(200, search_data)
            if "/species/5606" in url:
                return _mock_response(200, detail_data)
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_with_details(
                "Amphiprion ocellaris", include_images=True
            )

        assert len(results) == 1
        assert "thumbnail" in results[0]
        assert results[0]["thumbnail"] == "https://thumb.url/tn.jpg"

    @pytest.mark.asyncio
    async def test_combined_search_no_details_returned(self):
        """If get_species_by_id returns None, that species is skipped."""
        search_data = [{"SpecCode": 99999, "Genus": "Unknown"}]

        mock_client = AsyncMock()
        error = httpx.HTTPStatusError(
            "Not Found",
            request=MagicMock(),
            response=MagicMock(status_code=404),
        )

        async def mock_get(url, **kwargs):
            params = kwargs.get("params", {})
            if "/species" in url and "Genus" in params:
                return _mock_response(200, search_data)
            if "/species/99999" in url:
                return _mock_response(404, None, raise_for_status_error=error)
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_with_details("Unknown species")

        assert results == []

    @pytest.mark.asyncio
    async def test_combined_search_empty_search(self):
        """If initial search returns nothing, enriched results are empty."""
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=_mock_response(200, []))

        with _patch_async_client(mock_client):
            results = await self.service.search_with_details("nonexistent")

        assert results == []

    @pytest.mark.asyncio
    async def test_combined_search_species_without_speccode(self):
        """Species entries missing SpecCode are skipped."""
        search_data = [{"Genus": "Amphiprion"}]  # no SpecCode

        mock_client = AsyncMock()

        async def mock_get(url, **kwargs):
            params = kwargs.get("params", {})
            if "/species" in url and "Genus" in params:
                return _mock_response(200, search_data)
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_with_details("Amphiprion ocellaris")

        assert results == []

    @pytest.mark.asyncio
    async def test_combined_search_with_images_no_thumbnail(self):
        """When include_images=True but no images exist, no thumbnail key is added."""
        search_data = [{"SpecCode": 5606, "Genus": "Amphiprion"}]
        detail_data = [{"SpecCode": 5606, "Genus": "Amphiprion", "Species": "ocellaris"}]

        mock_client = AsyncMock()

        async def mock_get(url, **kwargs):
            params = kwargs.get("params", {})
            if "/photos" in url:
                return _mock_response(200, [])
            if "/species" in url and "Genus" in params:
                return _mock_response(200, search_data)
            if "/species/5606" in url:
                return _mock_response(200, detail_data)
            return _mock_response(200, [])

        mock_client.get = AsyncMock(side_effect=mock_get)

        with _patch_async_client(mock_client):
            results = await self.service.search_with_details(
                "Amphiprion ocellaris", include_images=True
            )

        assert len(results) == 1
        assert "thumbnail" not in results[0]
