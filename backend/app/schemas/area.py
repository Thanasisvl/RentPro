from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AreaOut(BaseModel):
    id: int
    code: str
    name: str
    area_score: float = Field(..., ge=0)

    model_config = ConfigDict(from_attributes=True)


class AreaAdminOut(AreaOut):
    is_active: bool


class AreaCreate(BaseModel):
    code: str = Field(
        ..., min_length=1, description="Unique stable code (e.g. MAROUSI)"
    )
    name: str = Field(..., min_length=1)
    area_score: float = Field(..., ge=0)
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def normalize_code(cls, v):
        if v is None:
            return v
        return str(v).strip().upper()

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, v):
        if v is None:
            return v
        return str(v).strip()


class AreaUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    area_score: float | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_update_name(cls, v):
        if v is None:
            return v
        return str(v).strip() or None
