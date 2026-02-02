from app.db.session import engine, Base
from app.models import user, property, tenant, contract  # ensure all tables are registered

Base.metadata.create_all(bind=engine)