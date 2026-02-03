import app.models  # noqa: F401  # ensure all models/tables are registered
from app.db.session import Base, engine

Base.metadata.create_all(bind=engine)
