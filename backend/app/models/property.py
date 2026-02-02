from enum import Enum

from sqlalchemy import Column, Integer, String, Float, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as SAEnum

from app.db.session import Base


class PropertyStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    RENTED = "RENTED"
    INACTIVE = "INACTIVE"


class Property(Base):
    __tablename__ = "properties"

    __table_args__ = (
        CheckConstraint(
            "type IN ('STUDIO','APARTMENT','MAISONETTE','DETACHED_HOUSE')",
            name="ck_properties_type_allowed",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    address = Column(String, index=True)
    type = Column(String, index=True)
    size = Column(Float)
    price = Column(Float)

    status = Column(
        SAEnum(PropertyStatus, name="property_status", native_enum=False),
        nullable=False,
        default=PropertyStatus.AVAILABLE,
        server_default=PropertyStatus.AVAILABLE.value,
    )

    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="properties")
    contracts = relationship("Contract", back_populates="property")

    # UC-04: derived numeric location features (1–1)
    location_features = relationship(
        "PropertyLocationFeatures",
        back_populates="property",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )