import os
import sys

# IMPORTANT: set test env BEFORE app/db/session.py is imported anywhere.
# This prevents the SQLAlchemy engine from being created against the dev DB.
os.environ.setdefault("RENTPRO_DATABASE_URL", "sqlite:///./test_test.db")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

from dotenv import load_dotenv

# Optional: load .env without overriding the test defaults above
load_dotenv()


# Ensure "backend/" is on sys.path so "import app.*" works during pytest collection.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
