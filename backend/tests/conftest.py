import os
import sys

# Ensure "backend/" is on sys.path so "import app.*" works during pytest collection.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)