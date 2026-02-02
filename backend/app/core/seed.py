from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.criterion import Criterion


DEFAULT_CRITERIA = [
    # UC-04 — TOPSIS criteria
    {"key": "price", "label": "Price (€/month)", "is_benefit": False},         # cost
    {"key": "size", "label": "Size (sqm)", "is_benefit": True},               # benefit
    {"key": "property_type", "label": "Property type", "is_benefit": True},   # benefit (categorical->numeric later)
    {"key": "area_score", "label": "Area score", "is_benefit": True},         # benefit (from PropertyLocationFeatures.area_score)
]


def seed_locked_criteria(db: Session) -> None:
    """
    Locked seed:
    - inserts missing criteria
    - does NOT modify existing rows (no updates)
    - "locked" is enforced by not providing CRUD endpoints for criteria
    """
    existing_keys = {c.key for c in db.query(Criterion.key).all()}

    to_add = []
    for c in DEFAULT_CRITERIA:
        if c["key"] in existing_keys:
            continue
        to_add.append(Criterion(**c, is_active=True))

    if not to_add:
        return

    db.add_all(to_add)
    db.commit()