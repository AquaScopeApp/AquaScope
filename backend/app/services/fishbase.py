"""
FishBase Service

Integrates with FishBase API for fish species information.

What is FishBase?
=================
FishBase (fishbase.org) is a global biodiversity information system on finfishes.
It's the world's largest and most extensively accessed online database on fish.

Data includes:
- Scientific and common names
- Taxonomy
- Distribution and habitat
- Biology (diet, reproduction, behavior)
- Maximum size
- Aquarium suitability
- And much more

API Access:
===========
FishBase provides a free RESTful API through rOpenSci:
https://fishbase.ropensci.org

Endpoints used:
- GET /species - Search for species
- GET /species/{id} - Get species details
- GET /comnames - Get common names

Why integrate FishBase?
========================
1. Accurate species identification
2. Care requirements and compatibility
3. Maximum size planning (bioload)
4. Diet and feeding requirements
5. Educational value for hobbyists

Limitations:
============
- FishBase focuses on fish (not corals or invertebrates)
- For corals: Consider CoralTraits Database or AIMS Coral Database
- For invertebrates: WoRMS (World Register of Marine Species)

Future Enhancement:
===================
Could add support for:
- CoralTraits API for coral species
- WoRMS API for invertebrate species
- AlgaeBase for macroalgae
"""
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings


class FishBaseService:
    """Service for interacting with FishBase API"""

    def __init__(self):
        """Initialize FishBase service with API base URL"""
        self.base_url = settings.FISHBASE_API_URL
        self.timeout = 10.0  # API timeout in seconds

    def clean_species_name(self, name: str) -> str:
        """
        Clean species name by removing numbers and extra whitespace.

        Examples:
            "Amphiprion ocellaris 5606" -> "Amphiprion ocellaris"
            "Zebrasoma flavescens  123" -> "Zebrasoma flavescens"
        """
        import re
        # Remove numbers at the end
        name = re.sub(r'\s+\d+$', '', name)
        # Remove extra whitespace
        name = ' '.join(name.split())
        return name.strip()

    async def search_species(
        self,
        query: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for fish species by name.

        Args:
            query: Search term (scientific or common name)
            limit: Maximum number of results to return

        Returns:
            List of species matches with basic information

        Example:
            >>> await service.search_species("clownfish")
            [
                {
                    "SpecCode": 5606,
                    "Genus": "Amphiprion",
                    "Species": "ocellaris",
                    "SpeciesRefNo": 1602,
                    ...
                }
            ]
        """
        try:
            # Clean the query
            query = self.clean_species_name(query)

            # Disable SSL verification for FishBase API (development only)
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # Try searching by scientific name first (Genus + Species)
                parts = query.split()
                results = []

                if len(parts) >= 2:
                    # Search by Genus and Species separately for better matches
                    genus = parts[0]
                    species = parts[1]

                    response = await client.get(
                        f"{self.base_url}/species",
                        params={"Genus": genus, "Species": species, "limit": limit}
                    )
                    response.raise_for_status()
                    results = response.json()

                # If no results, try searching by full query
                if not results:
                    response = await client.get(
                        f"{self.base_url}/species",
                        params={"Species": query, "limit": limit}
                    )
                    response.raise_for_status()
                    results = response.json()

                return results if isinstance(results, list) else []
        except httpx.HTTPError as e:
            print(f"Error searching FishBase: {e}")
            return []

    async def get_species_by_id(self, species_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed species information by ID.

        Args:
            species_id: FishBase species code (SpecCode)

        Returns:
            Detailed species information or None if not found

        Example:
            >>> await service.get_species_by_id("5606")
            {
                "SpecCode": 5606,
                "Genus": "Amphiprion",
                "Species": "ocellaris",
                "FBname": "Clown anemonefish",
                "Length": 11.0,  # Max length in cm
                "Vulnerability": 22.5,
                ...
            }
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                response = await client.get(
                    f"{self.base_url}/species/{species_id}"
                )
                response.raise_for_status()
                result = response.json()
                return result[0] if isinstance(result, list) and len(result) > 0 else result
        except httpx.HTTPError as e:
            print(f"Error fetching species from FishBase: {e}")
            return None

    async def get_common_names(self, species_id: str) -> List[Dict[str, Any]]:
        """
        Get all common names for a species.

        Species often have multiple common names across languages and regions.

        Args:
            species_id: FishBase species code

        Returns:
            List of common names with language and region

        Example:
            >>> await service.get_common_names("5606")
            [
                {"ComName": "Clownfish", "Language": "English", "Country": "USA"},
                {"ComName": "False clownfish", "Language": "English", "Country": "UK"},
                {"ComName": "Poisson-clown", "Language": "French", "Country": "France"},
                ...
            ]
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                response = await client.get(
                    f"{self.base_url}/comnames",
                    params={"SpecCode": species_id}
                )
                response.raise_for_status()
                result = response.json()
                return result if isinstance(result, list) else []
        except httpx.HTTPError as e:
            print(f"Error fetching common names from FishBase: {e}")
            return []

    async def get_species_images(self, species_id: str) -> List[Dict[str, Any]]:
        """
        Get images/photos for a species from FishBase.

        Args:
            species_id: FishBase species code

        Returns:
            List of image URLs and metadata

        Example:
            >>> await service.get_species_images("5606")
            [
                {
                    "PicID": "FA00001",
                    "autoctr": 1234,
                    "SpecCode": 5606,
                    "PicPreferredName": "Amphiprion ocellaris",
                    "PicName": "amphiprion_ocellaris_01.jpg",
                    "Pic": "https://fishbase.ropensci.org/...",
                    "ThumbPic": "https://fishbase.ropensci.org/..."
                }
            ]
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout, verify=False) as client:
                # FishBase photos endpoint
                response = await client.get(
                    f"{self.base_url}/photos",
                    params={"SpecCode": species_id}
                )
                response.raise_for_status()
                photos = response.json()

                # Ensure we have a list
                if not isinstance(photos, list):
                    return []

                # Return photos with properly formatted URLs
                # FishBase photos are available at fishbase.org
                for photo in photos:
                    if isinstance(photo, dict) and "PicName" in photo:
                        # Add full URLs if they're not already included
                        pic_name = photo["PicName"]
                        if not photo.get("Pic"):
                            photo["Pic"] = f"https://www.fishbase.se/images/species/{pic_name}"
                        if not photo.get("ThumbPic"):
                            # Thumbnails are typically prefixed with "tn_"
                            thumb_name = f"tn_{pic_name}"
                            photo["ThumbPic"] = f"https://www.fishbase.se/images/thumbnails/{thumb_name}"

                return photos
        except httpx.HTTPError as e:
            print(f"Error fetching images from FishBase: {e}")
            return []
        except Exception as e:
            print(f"Unexpected error fetching images: {e}")
            return []

    async def get_primary_image(self, species_id: str) -> Optional[str]:
        """
        Get the primary/thumbnail image URL for a species.

        Convenience method to get just the main thumbnail for display.

        Args:
            species_id: FishBase species code

        Returns:
            Thumbnail URL or None if no image available

        Example:
            >>> await service.get_primary_image("5606")
            "https://www.fishbase.se/images/thumbnails/tn_amphiprion_ocellaris_01.jpg"
        """
        images = await self.get_species_images(species_id)
        if images and len(images) > 0:
            # Return the first (primary) thumbnail
            return images[0].get("ThumbPic") or images[0].get("Pic")
        return None

    async def search_with_details(
        self,
        query: str,
        limit: int = 10,
        include_images: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Search species and enrich with detailed information.

        Convenience method that combines search with details fetch.

        Args:
            query: Search term
            limit: Maximum results
            include_images: If True, also fetch image URLs

        Returns:
            List of species with enriched details
        """
        species_list = await self.search_species(query, limit)
        enriched_results = []

        for species in species_list:
            if "SpecCode" in species:
                spec_code = str(species["SpecCode"])
                details = await self.get_species_by_id(spec_code)
                if details:
                    # Optionally add thumbnail
                    if include_images:
                        thumbnail = await self.get_primary_image(spec_code)
                        if thumbnail:
                            details["thumbnail"] = thumbnail
                    enriched_results.append(details)

        return enriched_results


# Singleton instance
fishbase_service = FishBaseService()
