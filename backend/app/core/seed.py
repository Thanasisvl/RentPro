from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.area import Area
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
    },  # benefit (from Area.area_score)
]

DEFAULT_AREAS = [
    # Stable codes for UI dropdown + migrations/tests
    {"code": "UNKNOWN", "name": "Unknown / Other", "area_score": 0.0},
    {"code": "MAROUSI", "name": "Μαρούσι", "area_score": 7.5},
    {"code": "KIFISIA", "name": "Κηφισιά", "area_score": 8.1},
    {"code": "CHALANDRI", "name": "Χαλάνδρι", "area_score": 7.6},
    {"code": "AGIA_PARASKEVI", "name": "Αγία Παρασκευή", "area_score": 7.4},
    {"code": "PAPAGOU", "name": "Παπάγου", "area_score": 7.3},
    {"code": "ATHENS", "name": "Αθήνα", "area_score": 7.2},
    {"code": "ZOGRAFOU", "name": "Ζωγράφου", "area_score": 7.0},
    {"code": "KAISARIANI", "name": "Καισαριανή", "area_score": 7.0},
    {"code": "GALATSI", "name": "Γαλάτσι", "area_score": 6.9},
    {"code": "VYRONAS", "name": "Βύρωνας", "area_score": 6.9},
    {"code": "ILIOUPOLI", "name": "Ηλιούπολη", "area_score": 7.1},
    {"code": "NEA_SMYRNI", "name": "Νέα Σμύρνη", "area_score": 7.0},
    {"code": "KALLITHEA", "name": "Καλλιθέα", "area_score": 7.8},
    {"code": "MOSCHATO", "name": "Μοσχάτο", "area_score": 6.7},
    {"code": "PALAIO_FALIRO", "name": "Παλαιό Φάληρο", "area_score": 7.7},
    {"code": "ALIMOS", "name": "Άλιμος", "area_score": 7.8},
    {"code": "GLYFADA", "name": "Γλυφάδα", "area_score": 8.3},
    {"code": "CHOLARGOS", "name": "Χολαργός", "area_score": 7.1},
    {"code": "ELLINIKO", "name": "Ελληνικό", "area_score": 7.6},
    {"code": "PIRAEUS", "name": "Πειραιάς", "area_score": 6.6},
    {"code": "NIKAIA", "name": "Νίκαια", "area_score": 6.2},
    {"code": "KORYDALLOS", "name": "Κορυδαλλός", "area_score": 6.1},
    {"code": "KERATSINI", "name": "Κερατσίνι", "area_score": 5.9},
    {"code": "PERISTERI", "name": "Περιστέρι", "area_score": 5.8},
    {"code": "AIGALEO", "name": "Αιγάλεω", "area_score": 5.9},
    {"code": "ILION", "name": "Ίλιον", "area_score": 5.7},
    {"code": "PETROUPOLI", "name": "Πετρούπολη", "area_score": 5.8},
    {"code": "CHAIDARI", "name": "Χαϊδάρι", "area_score": 5.8},
    {"code": "VRILISSIA", "name": "Βριλήσσια", "area_score": 7.7},
    {"code": "NEO_IRAKLEIO", "name": "Νέο Ηράκλειο", "area_score": 6.8},
    {"code": "METAMORFOSI", "name": "Μεταμόρφωση", "area_score": 6.9},
    {"code": "NEA_IONIA", "name": "Νέα Ιωνία", "area_score": 7.2},
    {"code": "PENTELI", "name": "Πεντέλη", "area_score": 7.4},
    # --- More municipalities (Attica) ---
    {"code": "PSYCHIKO", "name": "Ψυχικό", "area_score": 8.0},
    {"code": "FILOTHEI", "name": "Φιλοθέη", "area_score": 8.0},
    {"code": "NEO_PSYCHIKO", "name": "Νέο Ψυχικό", "area_score": 7.9},
    {"code": "PAPAGOU_CHOLARGOS", "name": "Παπάγου-Χολαργός", "area_score": 7.3},
    {"code": "PEFKI_LYKOVRYSI", "name": "Λυκόβρυση-Πεύκη", "area_score": 7.2},
    {"code": "IRAKLEIO_ATTIKIS", "name": "Ηράκλειο Αττικής", "area_score": 6.9},
    {"code": "DIONYSOS", "name": "Διόνυσος", "area_score": 7.4},
    {"code": "PAIANIA", "name": "Παιανία", "area_score": 6.8},
    {"code": "PALLINI", "name": "Παλλήνη", "area_score": 7.0},
    {"code": "GERAKAS", "name": "Γέρακας", "area_score": 7.0},
    {"code": "KOROPI", "name": "Κορωπί", "area_score": 6.6},
    {"code": "SPATA_ARTEMIDA", "name": "Σπάτα-Αρτέμιδα", "area_score": 6.7},
    {"code": "RAFINA_PIKERMI", "name": "Ραφήνα-Πικέρμι", "area_score": 6.9},
    {"code": "MARKOPOULO_MESOGEIAS", "name": "Μαρκόπουλο Μεσογαίας", "area_score": 6.5},
    {
        "code": "VARI_VOULA_VOULIAGMENI",
        "name": "Βάρη-Βούλα-Βουλιαγμένη",
        "area_score": 8.4,
    },
    {"code": "ARGYROUPOLI", "name": "Αργυρούπολη", "area_score": 7.2},
    {"code": "DAFNI_YMITTOS", "name": "Δάφνη-Υμηττός", "area_score": 6.9},
]


def seed_locked_areas(db: Session) -> None:
    """
    Bootstrap seed for areas:
    - inserts missing areas by stable code

    NOTE: area_score is centrally stored in DB (areas table). If you want the code
    dictionary to be authoritative (overwrite DB on startup), enable it explicitly.
    """
    existing_codes = {c for (c,) in db.query(Area.code).all()}

    to_add = []
    for src in DEFAULT_AREAS:
        code = str(src["code"]).strip().upper()
        if code in existing_codes:
            continue
        to_add.append(
            Area(
                code=code,
                name=str(src["name"]).strip(),
                area_score=float(src["area_score"]),
                is_active=True,
            )
        )

    if not to_add:
        return

    db.add_all(to_add)
    db.commit()


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
    # Ensure areas exist (migration also seeds, but keep this safe/idempotent)
    seed_locked_areas(db)

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
            "username": "owner6",
            "email": "owner6@example.com",
            "full_name": "Owner Six",
            "role": UserRole.OWNER,
        },
        {
            "username": "owner7",
            "email": "owner7@example.com",
            "full_name": "Owner Seven",
            "role": UserRole.OWNER,
        },
        {
            "username": "owner8",
            "email": "owner8@example.com",
            "full_name": "Owner Eight",
            "role": UserRole.OWNER,
        },
        {
            "username": "owner9",
            "email": "owner9@example.com",
            "full_name": "Owner Nine",
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
        .filter(
            User.username.in_(
                [
                    "owner1",
                    "owner2",
                    "owner3",
                    "owner4",
                    "owner5",
                    "owner6",
                    "owner7",
                    "owner8",
                    "owner9",
                ]
            )
        )
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
            "area_code": "MAROUSI",
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
            "area_code": "ATHENS",
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
            "area_code": "ATHENS",
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
            "area_code": "NEA_SMYRNI",
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
            "area_code": "KALLITHEA",
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
            "area_code": "CHOLARGOS",
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
            "area_code": "ELLINIKO",
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
            "area_code": "ATHENS",
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
            "area_code": "PIRAEUS",
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
            "area_code": "PERISTERI",
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
            "area_code": "VRILISSIA",
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
            "area_code": "NEO_IRAKLEIO",
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
            "area_code": "METAMORFOSI",
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
            "area_code": "NEA_IONIA",
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
            "area_code": "PENTELI",
        },
        # --- New owners (each gets 1–2 properties) ---
        {
            "owner_username": "owner6",
            "title": "E2E Seed Property 16",
            "description": "Seeded fixture (south suburbs)",
            "address": "Ανθέων 3, Γλυφάδα",
            "type": "APARTMENT",
            "size": 68.0,
            "price": 1150.0,
            "status": PropertyStatus.AVAILABLE,
            "area_code": "GLYFADA",
        },
        {
            "owner_username": "owner6",
            "title": "E2E Seed Property 17",
            "description": "Seeded fixture (south suburbs)",
            "address": "Λ. Ποσειδώνος 120, Παλαιό Φάληρο",
            "type": "STUDIO",
            "size": 36.0,
            "price": 650.0,
            "status": PropertyStatus.AVAILABLE,
            "area_code": "PALAIO_FALIRO",
        },
        {
            "owner_username": "owner7",
            "title": "E2E Seed Property 18",
            "description": "Seeded fixture (north suburbs)",
            "address": "Κολοκοτρώνη 22, Χαλάνδρι",
            "type": "APARTMENT",
            "size": 74.0,
            "price": 980.0,
            "status": PropertyStatus.AVAILABLE,
            "area_code": "CHALANDRI",
        },
        {
            "owner_username": "owner7",
            "title": "E2E Seed Property 19",
            "description": "Seeded fixture (north suburbs)",
            "address": "Κανάρη 8, Κηφισιά",
            "type": "DETACHED_HOUSE",
            "size": 138.0,
            "price": 2200.0,
            "status": PropertyStatus.AVAILABLE,
            "area_code": "KIFISIA",
        },
        {
            "owner_username": "owner8",
            "title": "E2E Seed Property 20",
            "description": "Seeded fixture (west suburbs)",
            "address": "Λ. Αθηνών 55, Αιγάλεω",
            "type": "APARTMENT",
            "size": 58.0,
            "price": 720.0,
            "status": PropertyStatus.AVAILABLE,
            "area_code": "AIGALEO",
        },
        {
            "owner_username": "owner9",
            "title": "E2E Seed Property 21",
            "description": "Seeded fixture (east attica)",
            "address": "Κεντρική Πλατεία 1, Παλλήνη",
            "type": "APARTMENT",
            "size": 62.0,
            "price": 820.0,
            "status": PropertyStatus.AVAILABLE,
            "area_code": "PALLINI",
        },
    ]

    for fx in property_fixtures:
        owner = owners.get(fx["owner_username"])
        if not owner:
            continue

        # Resolve area_id up-front (properties.area_id is NOT NULL).
        code = str(fx.get("area_code") or "UNKNOWN").strip().upper()
        a = db.query(Area).filter(Area.code == code).first()
        if a is None:
            a = db.query(Area).filter(Area.code == "UNKNOWN").first()
        area_id = a.id if a is not None else 1

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
                area_id=area_id,
            )
            db.add(existing_prop)
            db.flush()  # ensure id

        # Set area_id only if missing (keep idempotent/no-updates behavior)
        if existing_prop.area_id is None:
            existing_prop.area_id = area_id

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
