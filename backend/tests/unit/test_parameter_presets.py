"""
Tests for parameter presets service

Tests the default parameter ranges for different water types and subtypes.
"""
import pytest
from app.services.parameter_presets import (
    get_default_ranges,
    WATER_TYPE_DEFAULTS,
    SUBTYPE_PRESETS,
)

SALTWATER_DEFAULTS = WATER_TYPE_DEFAULTS["saltwater"]
FRESHWATER_DEFAULTS = WATER_TYPE_DEFAULTS["freshwater"]
BRACKISH_DEFAULTS = WATER_TYPE_DEFAULTS["brackish"]


class TestParameterPresets:
    """Test default parameter ranges by water type."""

    def test_saltwater_defaults_exist(self):
        """Saltwater defaults should include reef-specific parameters."""
        assert "calcium" in SALTWATER_DEFAULTS
        assert "magnesium" in SALTWATER_DEFAULTS
        assert "alkalinity_kh" in SALTWATER_DEFAULTS
        assert "salinity" in SALTWATER_DEFAULTS
        assert "temperature" in SALTWATER_DEFAULTS
        assert "ph" in SALTWATER_DEFAULTS

    def test_freshwater_defaults_exist(self):
        """Freshwater defaults should include freshwater-specific parameters."""
        assert "temperature" in FRESHWATER_DEFAULTS
        assert "ph" in FRESHWATER_DEFAULTS
        assert "gh" in FRESHWATER_DEFAULTS
        assert "ammonia" in FRESHWATER_DEFAULTS
        assert "nitrite" in FRESHWATER_DEFAULTS
        assert "nitrate" in FRESHWATER_DEFAULTS

    def test_brackish_defaults_exist(self):
        """Brackish defaults should include brackish-specific parameters."""
        assert "temperature" in BRACKISH_DEFAULTS
        assert "ph" in BRACKISH_DEFAULTS
        assert "salinity" in BRACKISH_DEFAULTS

    def test_get_default_ranges_saltwater(self):
        """Getting defaults for saltwater should return saltwater ranges."""
        ranges = get_default_ranges("saltwater")
        assert len(ranges) > 0
        assert any(r["parameter_type"] == "calcium" for r in ranges)
        assert any(r["parameter_type"] == "salinity" for r in ranges)

    def test_get_default_ranges_freshwater(self):
        """Getting defaults for freshwater should return freshwater ranges."""
        ranges = get_default_ranges("freshwater")
        assert len(ranges) > 0
        assert any(r["parameter_type"] == "gh" for r in ranges)
        assert any(r["parameter_type"] == "ammonia" for r in ranges)

    def test_get_default_ranges_brackish(self):
        """Getting defaults for brackish should return brackish ranges."""
        ranges = get_default_ranges("brackish")
        assert len(ranges) > 0
        assert any(r["parameter_type"] == "salinity" for r in ranges)

    def test_get_default_ranges_unknown_returns_saltwater(self):
        """Unknown water type should fall back to saltwater defaults."""
        ranges = get_default_ranges("unknown_type")
        saltwater_ranges = get_default_ranges("saltwater")
        assert len(ranges) == len(saltwater_ranges)

    def test_range_structure(self):
        """Each range entry should have required fields."""
        ranges = get_default_ranges("saltwater")
        for r in ranges:
            assert "parameter_type" in r
            assert "name" in r
            assert "unit" in r
            assert "min_value" in r
            assert "max_value" in r
            assert r["min_value"] <= r["max_value"]

    def test_saltwater_calcium_range(self):
        """Saltwater calcium range should be reasonable."""
        ranges = get_default_ranges("saltwater")
        calcium = next(r for r in ranges if r["parameter_type"] == "calcium")
        assert calcium["min_value"] >= 350
        assert calcium["max_value"] <= 500

    def test_freshwater_no_calcium(self):
        """Freshwater should not have calcium as a primary parameter."""
        ranges = get_default_ranges("freshwater")
        has_calcium = any(r["parameter_type"] == "calcium" for r in ranges)
        # Freshwater doesn't typically track calcium
        assert not has_calcium

    def test_all_saltwater_subtypes(self):
        """All saltwater subtypes should produce valid ranges."""
        for subtype in ["sps_dominant", "lps_dominant", "soft_coral", "mixed_reef", "fish_only", "fowlr"]:
            ranges = get_default_ranges("saltwater", subtype)
            assert len(ranges) > 0, f"No ranges for saltwater/{subtype}"

    def test_all_freshwater_subtypes(self):
        """All freshwater subtypes should produce valid ranges."""
        for subtype in ["amazonian", "tanganyika", "malawi", "planted", "community", "discus", "shrimp", "goldfish", "axolotl"]:
            ranges = get_default_ranges("freshwater", subtype)
            assert len(ranges) > 0, f"No ranges for freshwater/{subtype}"

    def test_all_brackish_subtypes(self):
        """All brackish subtypes should produce valid ranges."""
        for subtype in ["mangrove", "brackish_community"]:
            ranges = get_default_ranges("brackish", subtype)
            assert len(ranges) > 0, f"No ranges for brackish/{subtype}"

    def test_sps_tighter_nitrate_range(self):
        """SPS dominant should have tighter nitrate limits than fish only."""
        sps = get_default_ranges("saltwater", "sps_dominant")
        fish_only = get_default_ranges("saltwater", "fish_only")

        sps_nitrate = next(r for r in sps if r["parameter_type"] == "nitrate")
        fo_nitrate = next(r for r in fish_only if r["parameter_type"] == "nitrate")

        assert sps_nitrate["max_value"] < fo_nitrate["max_value"]

    def test_discus_high_temperature(self):
        """Discus should have higher temperature range than community."""
        discus = get_default_ranges("freshwater", "discus")
        community = get_default_ranges("freshwater", "community")

        discus_temp = next(r for r in discus if r["parameter_type"] == "temperature")
        community_temp = next(r for r in community if r["parameter_type"] == "temperature")

        assert discus_temp["min_value"] > community_temp["min_value"]

    def test_axolotl_low_temperature(self):
        """Axolotl should have lower temperature range."""
        axolotl = get_default_ranges("freshwater", "axolotl")
        axolotl_temp = next(r for r in axolotl if r["parameter_type"] == "temperature")

        assert axolotl_temp["max_value"] <= 20

    def test_subtype_presets_mapping(self):
        """All subtype presets should be accessible."""
        expected_subtypes = [
            "sps_dominant", "lps_dominant", "soft_coral", "mixed_reef",
            "fish_only", "fowlr", "amazonian", "tanganyika", "malawi",
            "planted", "community", "discus", "shrimp", "goldfish",
            "axolotl", "mangrove", "brackish_community",
        ]
        for subtype in expected_subtypes:
            assert subtype in SUBTYPE_PRESETS, f"Missing subtype: {subtype}"
