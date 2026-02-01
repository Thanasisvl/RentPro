from sqlalchemy import Column, Integer, ForeignKey, Date, Float, String, DateTime, func, Enum
from sqlalchemy.orm import relationship
from ..db.session import Base
import enum

class ContractStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    TERMINATED = "TERMINATED"
    EXPIRED = "EXPIRED"

class Contract(Base):
    __tablename__ = 'contracts'

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rent_amount = Column(Float, nullable=False)
    pdf_file = Column(String, nullable=True)

    status = Column(Enum(ContractStatus), nullable=False, default=ContractStatus.ACTIVE)  # added
    terminated_at = Column(DateTime(timezone=True), nullable=True)  # added

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    property = relationship("Property", back_populates="contracts")
    tenant = relationship("Tenant", back_populates="contracts")