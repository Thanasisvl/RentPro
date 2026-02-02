from __future__ import annotations

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from app.db.session import Base


class PropertyLocationFeatures(Base):
    __tablename__ = "property_location_features"

    # 1–1: κάνουμε το property_id και PK και FK
    property_id = Column(
        Integer,
        ForeignKey("properties.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    # UC-04: area/location numeric score (π.χ. 1–10)
    area_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    property = relationship("Property", back_populates="location_features", uselist=False)