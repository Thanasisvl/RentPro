"""make properties.area_id not null

Revision ID: 1c2a0b9d4e5f
Revises: 0f3c2d7a9a1b
Create Date: 2026-02-10

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "1c2a0b9d4e5f"
down_revision = "0f3c2d7a9a1b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Ensure no NULLs remain (fallback to UNKNOWN=1)
    conn.execute(sa.text("UPDATE properties SET area_id = 1 WHERE area_id IS NULL"))

    # SQLite can't ALTER COLUMN; use batch mode for portability.
    with op.batch_alter_table("properties") as batch_op:
        batch_op.alter_column("area_id", existing_type=sa.Integer(), nullable=False)


def downgrade() -> None:
    with op.batch_alter_table("properties") as batch_op:
        batch_op.alter_column("area_id", existing_type=sa.Integer(), nullable=True)
