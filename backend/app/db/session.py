import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.orm import Session

SQLALCHEMY_DATABASE_URL = os.getenv(
    "RENTPRO_DATABASE_URL",  # Use this env variable if set
    "sqlite:///./backend/rentpro_dev.db"    # Default to dev db in backend folder
)

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()