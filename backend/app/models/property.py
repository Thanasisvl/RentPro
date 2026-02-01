from enum import Enum

from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy import Enum as SAEnum

from app.db.session import Base


class PropertyStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    RENTED = "RENTED"
    INACTIVE = "INACTIVE"


class Property(Base):
    __tablename__ = "properties"

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