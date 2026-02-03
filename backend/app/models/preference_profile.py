from __future__ import annotations

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class PreferenceProfile(Base):
    __tablename__ = "preference_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_preference_profiles_user_id"),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name = Column(String, nullable=False, default="My preferences")

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User")

    pairwise_comparisons = relationship(
        "PairwiseComparison",
        back_populates="profile",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
