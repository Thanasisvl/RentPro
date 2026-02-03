import enum
from sqlalchemy import Column, Integer, ForeignKey, Date, Float, String, DateTime, func, Index
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
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    property = relationship("Property", back_populates="contracts")
    tenant = relationship("Tenant", back_populates="contracts")

# DB-level: at most 1 ACTIVE contract per property (works on PostgreSQL + SQLite partial index)
Index(
    "uq_contracts_one_active_per_property",
    Contract.property_id,
    unique=True,
    sqlite_where=(Contract.status == ContractStatus.ACTIVE),
    postgresql_where=(Contract.status == ContractStatus.ACTIVE),
)