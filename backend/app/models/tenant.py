from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Tenant(Base):
    __tablename__ = "tenants"

    __table_args__ = (
        UniqueConstraint("owner_id", "afm", name="uq_tenants_owner_afm"),
    )

    id = Column(Integer, primary_key=True, index=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    name = Column(String, index=True)
    afm = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    owner = relationship(
        "User",
        back_populates="tenants",
        foreign_keys=[owner_id],
    )
    created_by = relationship(
        "User",
        foreign_keys=[created_by_id],
    )
    updated_by = relationship(
        "User",
        foreign_keys=[updated_by_id],
    )

    contracts = relationship("Contract", back_populates="tenant")