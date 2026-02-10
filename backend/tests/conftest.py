import os
import sys

from dotenv import load_dotenv

# IMPORTANT: set test env BEFORE app/db/session.py is imported anywhere.
# This prevents the SQLAlchemy engine from being created against the dev DB.
os.environ["RENTPRO_DATABASE_URL"] = "sqlite:///./test_test.db"
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

# Ensure uploads write to a local, writable directory during tests.
# This prevents accidental use of Docker paths like /data/uploads coming from .env.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.environ["RENTPRO_UPLOAD_DIR"] = os.path.join(_BACKEND_DIR, ".test_uploads")

# Optional: load .env without overriding the test defaults above
load_dotenv(override=False)


# Ensure "backend/" is on sys.path so "import app.*" works during pytest collection.
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)


import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import inspect  # noqa: E402


def _alembic_config() -> Config:
    """
    Create an Alembic config for tests.

    - Points to backend/alembic.ini + backend/alembic/
    - Uses RENTPRO_DATABASE_URL from env
    """
    cfg = Config(os.path.join(_BACKEND_DIR, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(_BACKEND_DIR, "alembic"))
    cfg.set_main_option("sqlalchemy.url", os.environ["RENTPRO_DATABASE_URL"])
    return cfg


@pytest.fixture(scope="session")
def alembic_cfg() -> Config:
    return _alembic_config()


@pytest.fixture(autouse=True)
def reset_db(alembic_cfg: Config):
    """
    Ensure a clean schema per test by:
    - dropping all tables (including alembic_version)
    - running `alembic upgrade head`
    - seeding locked criteria (idempotent)

    This replaces Base.metadata.create_all() usage in individual tests.
    """
    from app.db.session import engine
    from tests.utils import seed_locked_criteria_for_tests

    dialect = engine.dialect.name

    with engine.begin() as conn:
        if dialect == "sqlite":
            conn.exec_driver_sql("PRAGMA foreign_keys=OFF")
            tables = inspect(conn).get_table_names()
            for t in tables:
                conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{t}"')
            conn.exec_driver_sql("PRAGMA foreign_keys=ON")
        elif dialect == "postgresql":
            # Keep it simple: drop all tables via schema reset.
            conn.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
            conn.exec_driver_sql("CREATE SCHEMA public")
        else:
            tables = inspect(conn).get_table_names()
            for t in tables:
                conn.exec_driver_sql(f'DROP TABLE IF EXISTS "{t}"')

    command.upgrade(alembic_cfg, "head")
    seed_locked_criteria_for_tests()
    yield
