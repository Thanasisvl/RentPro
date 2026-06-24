"""rename userrole USER to TENANT

Revision ID: a3b4c5d6e7f8
Revises: 2a8d7c1e6f00
Create Date: 2026-06-18

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a3b4c5d6e7f8"
down_revision = "2a8d7c1e6f00"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "postgresql":
        conn.execute(sa.text("ALTER TYPE userrole RENAME VALUE 'USER' TO 'TENANT'"))
    else:
        conn.execute(
            sa.text("UPDATE users SET role = 'TENANT' WHERE role = 'USER'")
        )


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "postgresql":
        conn.execute(sa.text("ALTER TYPE userrole RENAME VALUE 'TENANT' TO 'USER'"))
    else:
        conn.execute(
            sa.text("UPDATE users SET role = 'USER' WHERE role = 'TENANT'")
        )
