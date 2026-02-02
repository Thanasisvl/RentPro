from __future__ import annotations

# Locked criteria order for UC-04 (must match seed keys)
CRITERIA_ORDER = ["price", "size", "property_type", "area_score"]

# OFFICIAL (locked) categorical -> numeric mapping for Property.type used by TOPSIS (benefit)
PROPERTY_TYPE_MAPPING: dict[str, float] = {
    "STUDIO": 1.0,
    "APARTMENT": 2.0,
    "MAISONETTE": 3.0,
    "DETACHED_HOUSE": 4.0,
}

PROPERTY_TYPE_ALLOWED = tuple(PROPERTY_TYPE_MAPPING.keys())

# If True: fail fast when unknown Property.type is encountered among AVAILABLE properties
STRICT_PROPERTY_TYPE_MAPPING = True