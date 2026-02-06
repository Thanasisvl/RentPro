from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# Alembic Config object provides access to .ini values.
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Ensure "backend/" is on sys.path so "import app.*" works.
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import models so Base.metadata is fully populated.
import app.models  # noqa: F401  (side-effect import)
from app.db.session import Base  # noqa: E402

target_metadata = Base.metadata


def _get_database_url() -> str:
    url = os.getenv("RENTPRO_DATABASE_URL")
    if url and url.strip():
        return url.strip()
    # fallback to ini (mainly for local tooling)
    return config.get_main_option("sqlalchemy.url")


def run_migrations_offline() -> None:
    url = _get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    ini_section = config.get_section(config.config_ini_section) or {}
    ini_section["sqlalchemy.url"] = _get_database_url()

    connectable = engine_from_config(
        ini_section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

