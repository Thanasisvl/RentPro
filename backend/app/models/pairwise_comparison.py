from __future__ import annotations

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class PairwiseComparison(Base):
    __tablename__ = "pairwise_comparisons"
    __table_args__ = (
        UniqueConstraint(
            "profile_id",
            "criterion_a_id",
            "criterion_b_id",
            name="uq_pairwise_profile_criteria_pair",
        ),
        CheckConstraint(
            "criterion_a_id != criterion_b_id", name="ck_pairwise_distinct_criteria"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    profile_id = Column(
        Integer,
        ForeignKey("preference_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    criterion_a_id = Column(
        Integer,
        ForeignKey("criteria.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    criterion_b_id = Column(
        Integer,
        ForeignKey("criteria.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    value = Column(Float, nullable=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    profile = relationship("PreferenceProfile", back_populates="pairwise_comparisons")
    criterion_a = relationship("Criterion", foreign_keys=[criterion_a_id])
    criterion_b = relationship("Criterion", foreign_keys=[criterion_b_id])
