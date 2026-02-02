from __future__ import annotations

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func
from app.db.session import Base


class Criterion(Base):
    __tablename__ = "criteria"

    id = Column(Integer, primary_key=True, index=True)

    # stable key used by code (e.g. "price", "size", "property_type", "area_score")
    key = Column(String, unique=True, index=True, nullable=False)

    # human-friendly label for UI
    label = Column(String, nullable=False)

    # TOPSIS direction: benefit=True (higher is better) / benefit=False (lower is better)
    is_benefit = Column(Boolean, nullable=False)

    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)