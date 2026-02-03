from __future__ import annotations

from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.property import PropertyOut


class RecommendationItem(BaseModel):
    property: PropertyOut
    score: float = Field(..., ge=0, le=1)
    explain: Dict[str, Any] = Field(default_factory=dict)


class RecommendationsResponse(BaseModel):
    items: List[RecommendationItem]
    meta: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)
