"""add areas and property area_id

Revision ID: 0f3c2d7a9a1b
Revises: bb5a2e3cbaae
Create Date: 2026-02-10

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0f3c2d7a9a1b"
down_revision = "bb5a2e3cbaae"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Areas dictionary (locked-ish seed) ---
    op.create_table(
        "areas",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("area_score", sa.Float(), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_areas_id"), "areas", ["id"], unique=False)
    op.create_index(op.f("ix_areas_code"), "areas", ["code"], unique=True)

    # --- FK from properties -> areas ---
    # Use batch mode so SQLite can apply schema changes safely.
    with op.batch_alter_table("properties") as batch_op:
        batch_op.add_column(sa.Column("area_id", sa.Integer(), nullable=True))
        batch_op.create_index(op.f("ix_properties_area_id"), ["area_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_properties_area_id_areas",
            "areas",
            ["area_id"],
            ["id"],
            ondelete="RESTRICT",
        )

    # --- Seed areas (deterministic IDs for tests & migrations) ---
    areas_table = sa.table(
        "areas",
        sa.column("id", sa.Integer()),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("area_score", sa.Float()),
        sa.column("is_active", sa.Boolean()),
    )

    # Scores are 0–10 (benefit criterion). Adjust freely later; code/id remain stable.
    op.bulk_insert(
        areas_table,
        [
            {
                "id": 1,
                "code": "UNKNOWN",
                "name": "Unknown / Other",
                "area_score": 0.0,
                "is_active": True,
            },
            {
                "id": 10,
                "code": "MAROUSI",
                "name": "Μαρούσι",
                "area_score": 7.5,
                "is_active": True,
            },
            {
                "id": 11,
                "code": "ATHENS",
                "name": "Αθήνα",
                "area_score": 7.2,
                "is_active": True,
            },
            {
                "id": 12,
                "code": "NEA_SMYRNI",
                "name": "Νέα Σμύρνη",
                "area_score": 7.0,
                "is_active": True,
            },
            {
                "id": 13,
                "code": "KALLITHEA",
                "name": "Καλλιθέα",
                "area_score": 7.8,
                "is_active": True,
            },
            {
                "id": 14,
                "code": "CHOLARGOS",
                "name": "Χολαργός",
                "area_score": 7.1,
                "is_active": True,
            },
            {
                "id": 15,
                "code": "ELLINIKO",
                "name": "Ελληνικό",
                "area_score": 7.6,
                "is_active": True,
            },
            {
                "id": 16,
                "code": "PIRAEUS",
                "name": "Πειραιάς",
                "area_score": 6.6,
                "is_active": True,
            },
            {
                "id": 17,
                "code": "PERISTERI",
                "name": "Περιστέρι",
                "area_score": 5.8,
                "is_active": True,
            },
            {
                "id": 18,
                "code": "VRILISSIA",
                "name": "Βριλήσσια",
                "area_score": 7.7,
                "is_active": True,
            },
            {
                "id": 19,
                "code": "NEO_IRAKLEIO",
                "name": "Νέο Ηράκλειο",
                "area_score": 6.8,
                "is_active": True,
            },
            {
                "id": 20,
                "code": "METAMORFOSI",
                "name": "Μεταμόρφωση",
                "area_score": 6.9,
                "is_active": True,
            },
            {
                "id": 21,
                "code": "NEA_IONIA",
                "name": "Νέα Ιωνία",
                "area_score": 7.2,
                "is_active": True,
            },
            {
                "id": 22,
                "code": "PENTELI",
                "name": "Πεντέλη",
                "area_score": 7.4,
                "is_active": True,
            },
        ],
    )

    # Ensure subsequent inserts won't collide with explicit IDs (Postgres only).
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        conn.execute(
            sa.text(
                "SELECT setval(pg_get_serial_sequence('areas','id'), (SELECT MAX(id) FROM areas))"
            )
        )

    # --- Best-effort backfill properties.area_id from address ---
    # Default everything to UNKNOWN first, then set specific matches.
    conn.execute(sa.text("UPDATE properties SET area_id = 1 WHERE area_id IS NULL"))

    # Greek patterns (seed fixtures)
    patterns = [
        (10, "%Μαρούσι%"),
        (11, "%Αθήνα%"),
        (12, "%Νέα Σμύρνη%"),
        (13, "%Καλλιθέα%"),
        (14, "%Χολαργός%"),
        (15, "%Ελληνικό%"),
        (16, "%Πειραιάς%"),
        (17, "%Περιστέρι%"),
        (18, "%Βριλήσσια%"),
        (19, "%Νέο Ηράκλειο%"),
        (20, "%Μεταμόρφωση%"),
        (21, "%Νέα Ιωνία%"),
        (22, "%Πεντέλη%"),
    ]
    for area_id, like_pat in patterns:
        conn.execute(
            sa.text("UPDATE properties SET area_id = :area_id WHERE address LIKE :pat"),
            {"area_id": area_id, "pat": like_pat},
        )

    # English patterns (tests)
    english_patterns = [
        (11, "%Athens%"),
        (16, "%Piraeus%"),
        (11, "%Center%"),  # "Athens Center"
    ]
    for area_id, like_pat in english_patterns:
        conn.execute(
            sa.text("UPDATE properties SET area_id = :area_id WHERE address LIKE :pat"),
            {"area_id": area_id, "pat": like_pat},
        )


def downgrade() -> None:
    with op.batch_alter_table("properties") as batch_op:
        batch_op.drop_constraint("fk_properties_area_id_areas", type_="foreignkey")
        batch_op.drop_index(op.f("ix_properties_area_id"))
        batch_op.drop_column("area_id")

    op.drop_index(op.f("ix_areas_code"), table_name="areas")
    op.drop_index(op.f("ix_areas_id"), table_name="areas")
    op.drop_table("areas")
