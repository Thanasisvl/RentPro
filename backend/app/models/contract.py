from sqlalchemy import Column, Integer, ForeignKey, Date, Float, String, DateTime, func
from sqlalchemy.orm import relationship
from ..db.session import Base

class Contract(Base):
    __tablename__ = 'contracts'

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey('properties.id'), nullable=False)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    rent_amount = Column(Float, nullable=False)
    pdf_file = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    property = relationship("Property", back_populates="contracts")
    tenant = relationship("Tenant", back_populates="contracts")