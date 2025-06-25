from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String, index=True)
    hashed_password = Column(String)
    role = Column(String)

    properties = relationship("Property", back_populates="owner")
    tenant_profile = relationship("Tenant", back_populates="user", uselist=False)