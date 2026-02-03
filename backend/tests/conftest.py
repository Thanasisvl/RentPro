import os
import sys

from dotenv import load_dotenv


def pytest_configure() -> None:
    # Optional: load .env (if present)
    load_dotenv()

    # Ensure test defaults (CI can override)
    os.environ.setdefault("RENTPRO_DATABASE_URL", "sqlite:///./test_test.db")
    os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")


# Ensure "backend/" is on sys.path so "import app.*" works during pytest collection.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
