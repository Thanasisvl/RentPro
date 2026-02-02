from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class PreferenceProfileUpsert(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)


class PreferenceProfileOut(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PairwiseComparisonIn(BaseModel):
    criterion_a_key: str = Field(..., min_length=1, max_length=50)
    criterion_b_key: str = Field(..., min_length=1, max_length=50)
    value: float = Field(..., gt=0)

    @model_validator(mode="after")
    def validate_pair(self) -> "PairwiseComparisonIn":
        if self.criterion_a_key == self.criterion_b_key:
            raise ValueError("criterion_a_key and criterion_b_key must be different")
        return self

    @field_validator("value")
    @classmethod
    def validate_saaty_scale(cls, v: float) -> float:
        # Saaty scale typically in [1/9 .. 9]
        if v < (1.0 / 9.0) or v > 9.0:
            raise ValueError("value must be within Saaty scale range [1/9, 9]")
        return v


class PairwiseComparisonBatchIn(BaseModel):
    comparisons: List[PairwiseComparisonIn] = Field(..., min_length=1)


class PairwiseComparisonOut(BaseModel):
    id: int
    profile_id: int
    criterion_a_key: str
    criterion_b_key: str
    value: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)