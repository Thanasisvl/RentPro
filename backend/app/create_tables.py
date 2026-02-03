from app.db.session import engine, Base

import app.models  # noqa: F401  # ensure all models/tables are registered

Base.metadata.create_all(bind=engine)