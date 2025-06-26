from sqlalchemy import Column, Integer, String, Enum as SqlEnum
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.role import UserRole

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String, index=True)
    hashed_password = Column(String)
    role = Column(SqlEnum(UserRole), nullable=False, default=UserRole.USER)

    properties = relationship("Property", back_populates="owner")
    tenant_profile = relationship("Tenant", back_populates="user", uselist=False)