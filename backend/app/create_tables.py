from app.db.session import engine, Base
from app.models import user, property

Base.metadata.create_all(bind=engine)