import enum
from sqlalchemy import Column, Integer, ForeignKey, Date, Float, String, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as SAEnum

from app.db.session import Base


class ContractStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    TERMINATED = "TERMINATED"
    EXPIRED = "EXPIRED"


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, index=True)

    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rent_amount = Column(Float, nullable=False)

    pdf_file = Column(String, nullable=True)

    status = Column(
        SAEnum(ContractStatus, name="contract_status", native_enum=False),
        nullable=False,
        default=ContractStatus.ACTIVE,
        server_default=ContractStatus.ACTIVE.value,
    )

    terminated_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    property = relationship("Property", back_populates="contracts")
    tenant = relationship("Tenant", back_populates="contracts")