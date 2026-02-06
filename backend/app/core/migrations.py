from __future__ import annotations

import logging
import os
from pathlib import Path

from alembic import command
from alembic.config import Config

logger = logging.getLogger(__name__)


def run_migrations(*, required: bool = True) -> None:
    """
    Upgrade the database to the latest Alembic revision (head).

    - Uses RENTPRO_DATABASE_URL.
    - Looks for alembic.ini in the backend/ root.

    If required=False, errors are logged and swallowed (not recommended).
    """
    db_url = (os.getenv("RENTPRO_DATABASE_URL") or "").strip()
    if not db_url:
        msg = "RENTPRO_DATABASE_URL is not set; cannot run migrations"
        if required:
            raise RuntimeError(msg)
        logger.warning(msg)
        return

    # backend/app/core/migrations.py -> backend/
    backend_dir = Path(__file__).resolve().parent.parent.parent
    alembic_ini = backend_dir / "alembic.ini"
    if not alembic_ini.exists():
        msg = f"Missing Alembic config at {alembic_ini}"
        if required:
            raise RuntimeError(msg)
        logger.warning(msg)
        return

    cfg = Config(str(alembic_ini))
    cfg.set_main_option("sqlalchemy.url", db_url)

    logger.info("Running DB migrations to head")
    command.upgrade(cfg, "head")

