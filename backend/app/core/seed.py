from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.criterion import Criterion
from app.core.security import get_password_hash
from app.models.property import Property, PropertyStatus
from app.models.role import UserRole
from app.models.tenant import Tenant
from app.models.user import User

DEFAULT_CRITERIA = [
    # UC-04 — TOPSIS criteria
    {"key": "price", "label": "Price (€/month)", "is_benefit": False},  # cost
    {"key": "size", "label": "Size (sqm)", "is_benefit": True},  # benefit
    {
        "key": "property_type",
        "label": "Property type",
        "is_benefit": True,
    },  # benefit (categorical->numeric later)
    {
        "key": "area_score",
        "label": "Area score",
        "is_benefit": True,
    },  # benefit (from PropertyLocationFeatures.area_score)
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


def seed_e2e_fixtures(db: Session, *, password: str = "rentpro-e2e") -> None:
    """
    Seed minimal, idempotent fixtures for real integration E2E tests.

    This is intentionally small and safe to run multiple times.
    """
    # --- Users ---
    users = [
        {
            "username": "admin1",
            "email": "admin1@example.com",
            "full_name": "Admin One",
            "role": UserRole.ADMIN,
        },
        {
            "username": "owner1",
            "email": "owner1@example.com",
            "full_name": "Owner One",
            "role": UserRole.OWNER,
        },
        {
            # backend role USER maps to TENANT in the frontend (normalizeRole)
            "username": "tenant1",
            "email": "tenant1@example.com",
            "full_name": "Tenant One",
            "role": UserRole.USER,
        },
    ]

    existing = {
        u.username: u
        for u in db.query(User)
        .filter(User.username.in_([x["username"] for x in users]))
        .all()
    }

    for u in users:
        if u["username"] in existing:
            continue
        db.add(
            User(
                username=u["username"],
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=get_password_hash(password),
                role=u["role"],
            )
        )
    db.commit()

    owner = db.query(User).filter(User.username == "owner1").first()
    if not owner:
        return

    # --- Property (owned by owner1) ---
    prop = (
        db.query(Property)
        .filter(Property.owner_id == owner.id, Property.title == "E2E Seed Property")
        .first()
    )
    if not prop:
        db.add(
            Property(
                title="E2E Seed Property",
                description="Seeded fixture for Playwright integration tests",
                address="Athens",
                type="APARTMENT",
                size=55.0,
                price=650.0,
                status=PropertyStatus.AVAILABLE,
                owner_id=owner.id,
            )
        )

    # --- Tenant (owned by owner1) ---
    t = (
        db.query(Tenant)
        .filter(Tenant.owner_id == owner.id, Tenant.afm == "123456789")
        .first()
    )
    if not t:
        db.add(
            Tenant(
                owner_id=owner.id,
                name="E2E Seed Tenant",
                afm="123456789",
                phone="6900000000",
                email="seed.tenant@example.com",
                created_by_id=owner.id,
                updated_by_id=owner.id,
            )
        )

    db.commit()
