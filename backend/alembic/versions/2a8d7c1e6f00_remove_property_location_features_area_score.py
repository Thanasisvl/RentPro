"""remove property_location_features.area_score

Revision ID: 2a8d7c1e6f00
Revises: 1c2a0b9d4e5f
Create Date: 2026-02-10

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "2a8d7c1e6f00"
down_revision = "1c2a0b9d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Area score now comes from areas.area_score; keep the table but remove the column.
    with op.batch_alter_table("property_location_features") as batch_op:
        batch_op.drop_column("area_score")


def downgrade() -> None:
    with op.batch_alter_table("property_location_features") as batch_op:
        batch_op.add_column(sa.Column("area_score", sa.Float(), nullable=True))
