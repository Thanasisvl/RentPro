from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.criterion import Criterion
from app.core.security import get_password_hash
from app.models.property_location_features import PropertyLocationFeatures
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
            "username": "owner2",
            "email": "owner2@example.com",
            "full_name": "Owner Two",
            "role": UserRole.OWNER,
        },
        {
            "username": "owner3",
            "email": "owner3@example.com",
            "full_name": "Owner Three",
            "role": UserRole.OWNER,
        },
        {
            "username": "owner4",
            "email": "owner4@example.com",
            "full_name": "Owner Four",
            "role": UserRole.OWNER,
        },
        {
            "username": "owner5",
            "email": "owner5@example.com",
            "full_name": "Owner Five",
            "role": UserRole.OWNER,
        },
        {
            # backend role USER maps to TENANT in the frontend (normalizeRole)
            "username": "tenant1",
            "email": "tenant1@example.com",
            "full_name": "Tenant One",
            "role": UserRole.USER,
        },
        {
            # 2nd tenant login account (useful for multi-user manual testing)
            "username": "tenant2",
            "email": "tenant2@example.com",
            "full_name": "Tenant Two",
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

    owners = {
        u.username: u
        for u in db.query(User)
        .filter(User.username.in_(["owner1", "owner2", "owner3", "owner4", "owner5"]))
        .all()
    }
    if not owners.get("owner1"):
        return  # seed requires owner1 for integration tests

    # --- Properties ---
    #
    # Idempotent policy:
    # - insert missing properties by (owner, title)
    # - do NOT modify existing rows (no updates)
    # - add PropertyLocationFeatures only if missing (no updates)
    #
    # NOTE: The Playwright integration test expects the title "E2E Seed Property"
    # to exist in owner1's list.
    property_fixtures = [
        {
            "owner_username": "owner1",
            "title": "E2E Seed Property",
            "description": "Seeded fixture for Playwright integration tests",
            "address": "Λ. Κηφισίας 10, Μαρούσι",
            "type": "APARTMENT",
            "size": 55.0,
            "price": 650.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.5,
        },
        {
            "owner_username": "owner1",
            "title": "E2E Seed Property 02",
            "description": "Seeded fixture (manual testing)",
            "address": "Πατησίων 120, Αθήνα",
            "type": "STUDIO",
            "size": 34.0,
            "price": 520.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 6.2,
        },
        {
            "owner_username": "owner1",
            "title": "E2E Seed Property 03",
            "description": "Seeded fixture (manual testing)",
            "address": "Ακαδημίας 15, Αθήνα",
            "type": "APARTMENT",
            "size": 48.0,
            "price": 740.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 8.2,
        },
        {
            "owner_username": "owner2",
            "title": "E2E Seed Property 04",
            "description": "Seeded fixture (manual testing)",
            "address": "Λ. Συγγρού 180, Νέα Σμύρνη",
            "type": "APARTMENT",
            "size": 72.0,
            "price": 980.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.0,
        },
        {
            "owner_username": "owner2",
            "title": "E2E Seed Property 05",
            "description": "Seeded fixture (manual testing)",
            "address": "Θησέως 45, Καλλιθέα",
            "type": "MAISONETTE",
            "size": 96.0,
            "price": 1250.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.8,
        },
        {
            "owner_username": "owner2",
            "title": "E2E Seed Property 06",
            "description": "Seeded fixture (manual testing)",
            "address": "Λ. Μεσογείων 305, Χολαργός",
            "type": "APARTMENT",
            "size": 80.0,
            "price": 1100.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.1,
        },
        {
            "owner_username": "owner3",
            "title": "E2E Seed Property 07",
            "description": "Seeded fixture (manual testing)",
            "address": "Λ. Βουλιαγμένης 220, Ελληνικό",
            "type": "APARTMENT",
            "size": 64.0,
            "price": 890.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.6,
        },
        {
            "owner_username": "owner3",
            "title": "E2E Seed Property 08",
            "description": "Seeded fixture (manual testing)",
            "address": "Ιπποκράτους 90, Αθήνα",
            "type": "STUDIO",
            "size": 40.0,
            "price": 610.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.9,
        },
        {
            "owner_username": "owner3",
            "title": "E2E Seed Property 09",
            "description": "Seeded fixture (manual testing)",
            "address": "Κολοκοτρώνη 8, Πειραιάς",
            "type": "DETACHED_HOUSE",
            "size": 130.0,
            "price": 1650.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 6.6,
        },
        {
            # Useful for UC-03 gated details: non-AVAILABLE should not be public.
            "owner_username": "owner3",
            "title": "E2E Seed Property 10",
            "description": "Seeded fixture (manual testing)",
            "address": "Δεληγιάννη 30, Περιστέρι",
            "type": "APARTMENT",
            "size": 58.0,
            "price": 690.0,
            "status": PropertyStatus.INACTIVE,
            "area_score": 5.8,
        },
        # --- Extra north-suburbs properties (spread across new owners) ---
        {
            "owner_username": "owner4",
            "title": "E2E Seed Property 11",
            "description": "Seeded fixture (north suburbs)",
            "address": "Λ. Πεντέλης 12, Βριλήσσια",
            "type": "APARTMENT",
            "size": 78.0,
            "price": 1050.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.7,
        },
        {
            "owner_username": "owner4",
            "title": "E2E Seed Property 12",
            "description": "Seeded fixture (north suburbs)",
            "address": "Λ. Ηρακλείου 88, Νέο Ηράκλειο",
            "type": "STUDIO",
            "size": 38.0,
            "price": 590.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 6.8,
        },
        {
            "owner_username": "owner5",
            "title": "E2E Seed Property 13",
            "description": "Seeded fixture (north suburbs)",
            "address": "Λ. Δημοκρατίας 25, Μεταμόρφωση",
            "type": "APARTMENT",
            "size": 62.0,
            "price": 780.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 6.9,
        },
        {
            "owner_username": "owner5",
            "title": "E2E Seed Property 14",
            "description": "Seeded fixture (north suburbs)",
            "address": "Λ. Ηρακλείου 210, Νέα Ιωνία",
            "type": "MAISONETTE",
            "size": 102.0,
            "price": 1350.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.2,
        },
        {
            "owner_username": "owner5",
            "title": "E2E Seed Property 15",
            "description": "Seeded fixture (north suburbs)",
            "address": "Αγίου Γεωργίου 5, Πεντέλη",
            "type": "DETACHED_HOUSE",
            "size": 145.0,
            "price": 1850.0,
            "status": PropertyStatus.AVAILABLE,
            "area_score": 7.4,
        },
    ]

    for fx in property_fixtures:
        owner = owners.get(fx["owner_username"])
        if not owner:
            continue

        existing_prop = (
            db.query(Property)
            .filter(Property.owner_id == owner.id, Property.title == fx["title"])
            .first()
        )
        if not existing_prop:
            existing_prop = Property(
                title=fx["title"],
                description=fx["description"],
                address=fx["address"],
                type=fx["type"],
                size=fx["size"],
                price=fx["price"],
                status=fx["status"],
                owner_id=owner.id,
            )
            db.add(existing_prop)
            db.flush()  # ensure id

        if existing_prop.id is not None and fx.get("area_score") is not None:
            has_features = (
                db.query(PropertyLocationFeatures)
                .filter(PropertyLocationFeatures.property_id == existing_prop.id)
                .first()
            )
            if not has_features:
                db.add(
                    PropertyLocationFeatures(
                        property_id=existing_prop.id,
                        area_score=float(fx["area_score"]),
                    )
                )

    # --- Tenant (owned by owner1) ---
    owner1 = owners["owner1"]
    t = (
        db.query(Tenant)
        .filter(Tenant.owner_id == owner1.id, Tenant.afm == "123456789")
        .first()
    )
    if not t:
        db.add(
            Tenant(
                owner_id=owner1.id,
                name="E2E Seed Tenant",
                afm="123456789",
                phone="6900000000",
                email="seed.tenant@example.com",
                created_by_id=owner1.id,
                updated_by_id=owner1.id,
            )
        )

    # --- Another tenant (owned by owner1) ---
    t2 = (
        db.query(Tenant)
        .filter(Tenant.owner_id == owner1.id, Tenant.afm == "987654321")
        .first()
    )
    if not t2:
        db.add(
            Tenant(
                owner_id=owner1.id,
                name="E2E Seed Tenant 2",
                afm="987654321",
                phone="6900000001",
                email="seed.tenant2@example.com",
                created_by_id=owner1.id,
                updated_by_id=owner1.id,
            )
        )

    db.commit()
