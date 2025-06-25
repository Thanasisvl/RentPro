from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Tenant(Base):
    __tablename__ = 'tenants'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String, unique=True, index=True)
    afm = Column(String, unique=True, nullable=False)  # Tax ID
    phone = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=True)

    contracts = relationship("Contract", back_populates="tenant")
    user = relationship("User", back_populates="tenant_profile")