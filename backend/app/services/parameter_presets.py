"""
Parameter Presets Service

Default parameter ranges for each aquarium type and subtype.
These are used to populate a tank's parameter_ranges when it is created.
Users can customize ranges after creation.
"""
from typing import Dict, List, Optional


# Each preset entry: (name, unit, min, max, ideal)
PresetEntry = Dict[str, tuple]

# Common freshwater parameters (shared across most freshwater subtypes)
_FRESHWATER_BASE: PresetEntry = {
    "temperature": ("Temperature", "°C", 22, 28, 25),
    "ph": ("pH", "", 6.5, 7.5, 7.0),
    "gh": ("General Hardness (GH)", "dGH", 4, 12, 8),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 3, 8, 5),
    "ammonia": ("Ammonia (NH₃/NH₄)", "ppm", 0, 0.02, 0),
    "nitrite": ("Nitrite (NO₂)", "ppm", 0, 0.02, 0),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 40, 20),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0, 2.0, 0.5),
}

# Common saltwater parameters (shared across most saltwater subtypes)
_SALTWATER_BASE: PresetEntry = {
    "temperature": ("Temperature", "°C", 24, 27, 25.5),
    "ph": ("pH", "", 8.0, 8.4, 8.2),
    "salinity": ("Salinity", "SG", 1.024, 1.027, 1.026),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 7, 11, 8.5),
    "calcium": ("Calcium", "ppm", 380, 450, 420),
    "magnesium": ("Magnesium", "ppm", 1250, 1450, 1350),
    "ammonia": ("Ammonia (NH₃/NH₄)", "ppm", 0, 0.02, 0),
    "nitrite": ("Nitrite (NO₂)", "ppm", 0, 0.02, 0),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 20, 5),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0, 0.1, 0.03),
}


def _merge(base: PresetEntry, overrides: PresetEntry) -> PresetEntry:
    """Merge base presets with overrides."""
    result = dict(base)
    result.update(overrides)
    return result


# ============================================================================
# Saltwater Subtypes
# ============================================================================

SALTWATER_SPS: PresetEntry = _merge(_SALTWATER_BASE, {
    "calcium": ("Calcium", "ppm", 400, 450, 430),
    "magnesium": ("Magnesium", "ppm", 1280, 1400, 1350),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 7, 10, 8.5),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 10, 3),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0.01, 0.08, 0.03),
})

SALTWATER_LPS: PresetEntry = _merge(_SALTWATER_BASE, {
    "calcium": ("Calcium", "ppm", 380, 440, 410),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 7, 11, 9),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 20, 5),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0.01, 0.1, 0.05),
})

SALTWATER_SOFT: PresetEntry = _merge(_SALTWATER_BASE, {
    "calcium": ("Calcium", "ppm", 350, 420, 400),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 7, 12, 9),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 30, 10),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0.01, 0.15, 0.05),
})

SALTWATER_MIXED_REEF: PresetEntry = _merge(_SALTWATER_BASE, {
    "calcium": ("Calcium", "ppm", 390, 450, 420),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 7, 11, 8.5),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 15, 5),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0.01, 0.1, 0.04),
})

SALTWATER_FISH_ONLY: PresetEntry = _merge(_SALTWATER_BASE, {
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 40, 15),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0, 0.5, 0.1),
})

SALTWATER_FOWLR: PresetEntry = _merge(_SALTWATER_BASE, {
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 30, 10),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0, 0.3, 0.08),
})


# ============================================================================
# Freshwater Subtypes
# ============================================================================

FRESHWATER_AMAZONIAN: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 24, 28, 26),
    "ph": ("pH", "", 6.0, 7.0, 6.5),
    "gh": ("General Hardness (GH)", "dGH", 3, 8, 5),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 1, 4, 2),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 20, 10),
})

FRESHWATER_TANGANYIKA: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 24, 27, 25.5),
    "ph": ("pH", "", 7.8, 9.0, 8.5),
    "gh": ("General Hardness (GH)", "dGH", 10, 25, 15),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 15, 25, 18),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 25, 10),
})

FRESHWATER_MALAWI: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 24, 28, 26),
    "ph": ("pH", "", 7.5, 8.5, 8.0),
    "gh": ("General Hardness (GH)", "dGH", 8, 20, 12),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 10, 18, 14),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 30, 15),
})

FRESHWATER_PLANTED: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 22, 28, 25),
    "ph": ("pH", "", 6.5, 7.5, 7.0),
    "gh": ("General Hardness (GH)", "dGH", 4, 12, 8),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 3, 8, 5),
    "nitrate": ("Nitrate (NO₃)", "ppm", 5, 30, 15),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0.5, 2.0, 1.0),
})

FRESHWATER_COMMUNITY: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 22, 28, 25),
})

FRESHWATER_DISCUS: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 28, 32, 30),
    "ph": ("pH", "", 5.5, 7.0, 6.5),
    "gh": ("General Hardness (GH)", "dGH", 1, 8, 4),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 1, 4, 2),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 15, 5),
})

FRESHWATER_SHRIMP: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 20, 26, 23),
    "ph": ("pH", "", 6.0, 7.5, 6.8),
    "gh": ("General Hardness (GH)", "dGH", 4, 8, 6),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 2, 5, 3),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 10, 5),
})

FRESHWATER_GOLDFISH: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 18, 24, 21),
    "ph": ("pH", "", 7.0, 8.0, 7.5),
    "gh": ("General Hardness (GH)", "dGH", 6, 18, 12),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 4, 12, 8),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 30, 15),
})

FRESHWATER_AXOLOTL: PresetEntry = _merge(_FRESHWATER_BASE, {
    "temperature": ("Temperature", "°C", 16, 20, 18),
    "ph": ("pH", "", 6.5, 8.0, 7.5),
    "gh": ("General Hardness (GH)", "dGH", 7, 14, 10),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 3, 8, 6),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 20, 10),
})


# ============================================================================
# Brackish Subtypes
# ============================================================================

_BRACKISH_BASE: PresetEntry = {
    "temperature": ("Temperature", "°C", 24, 28, 26),
    "ph": ("pH", "", 7.5, 8.5, 8.0),
    "salinity": ("Salinity", "SG", 1.005, 1.015, 1.010),
    "gh": ("General Hardness (GH)", "dGH", 10, 20, 15),
    "alkalinity_kh": ("Alkalinity (KH)", "dKH", 8, 15, 12),
    "ammonia": ("Ammonia (NH₃/NH₄)", "ppm", 0, 0.02, 0),
    "nitrite": ("Nitrite (NO₂)", "ppm", 0, 0.02, 0),
    "nitrate": ("Nitrate (NO₃)", "ppm", 0, 30, 15),
    "phosphate": ("Phosphate (PO₄)", "ppm", 0, 1.0, 0.3),
}

BRACKISH_MANGROVE: PresetEntry = _merge(_BRACKISH_BASE, {})

BRACKISH_COMMUNITY: PresetEntry = _merge(_BRACKISH_BASE, {})


# ============================================================================
# Subtype -> Preset Mapping
# ============================================================================

SUBTYPE_PRESETS: Dict[str, PresetEntry] = {
    # Saltwater
    "sps_dominant": SALTWATER_SPS,
    "lps_dominant": SALTWATER_LPS,
    "soft_coral": SALTWATER_SOFT,
    "mixed_reef": SALTWATER_MIXED_REEF,
    "fish_only": SALTWATER_FISH_ONLY,
    "fowlr": SALTWATER_FOWLR,
    # Freshwater
    "amazonian": FRESHWATER_AMAZONIAN,
    "tanganyika": FRESHWATER_TANGANYIKA,
    "malawi": FRESHWATER_MALAWI,
    "planted": FRESHWATER_PLANTED,
    "community": FRESHWATER_COMMUNITY,
    "discus": FRESHWATER_DISCUS,
    "shrimp": FRESHWATER_SHRIMP,
    "goldfish": FRESHWATER_GOLDFISH,
    "axolotl": FRESHWATER_AXOLOTL,
    # Brackish
    "mangrove": BRACKISH_MANGROVE,
    "brackish_community": BRACKISH_COMMUNITY,
}

# Default presets when no subtype is selected
WATER_TYPE_DEFAULTS: Dict[str, PresetEntry] = {
    "freshwater": _FRESHWATER_BASE,
    "saltwater": _SALTWATER_BASE,
    "brackish": _BRACKISH_BASE,
}


def get_default_ranges(water_type: str, aquarium_subtype: Optional[str] = None) -> List[Dict]:
    """
    Get default parameter ranges for a given water type and subtype.

    Returns a list of dicts ready to create ParameterRange objects:
    [{"parameter_type": "calcium", "name": "Calcium", "unit": "ppm", "min_value": 400, "max_value": 450, "ideal_value": 430}, ...]
    """
    if aquarium_subtype and aquarium_subtype in SUBTYPE_PRESETS:
        preset = SUBTYPE_PRESETS[aquarium_subtype]
    elif water_type in WATER_TYPE_DEFAULTS:
        preset = WATER_TYPE_DEFAULTS[water_type]
    else:
        preset = _SALTWATER_BASE  # fallback

    result = []
    for param_type, (name, unit, min_val, max_val, ideal) in preset.items():
        result.append({
            "parameter_type": param_type,
            "name": name,
            "unit": unit,
            "min_value": min_val,
            "max_value": max_val,
            "ideal_value": ideal,
        })

    return result
