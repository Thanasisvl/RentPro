from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from app.models.property import PropertyStatus

class PropertyBase(BaseModel):
    title: str = Field(..., min_length=1)
    description: str
    address: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    size: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    status: PropertyStatus = PropertyStatus.AVAILABLE

    @field_validator("title", "address", "type", mode="before")
    @classmethod
    def strip_and_reject_blank(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

class PropertyCreate(PropertyBase):
    # Optional: used only by ADMIN to create on behalf of an owner.
    # For OWNER requests, this must be omitted.
    owner_id: int | None = Field(default=None, gt=0)

class PropertyUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None
    address: str | None = Field(default=None, min_length=1)
    type: str | None = Field(default=None, min_length=1)
    size: float | None = Field(default=None, gt=0)
    price: float | None = Field(default=None, gt=0)
    status: PropertyStatus | None = None

    @field_validator("title", "address", "type", mode="before")
    @classmethod
    def strip_and_reject_blank(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("must not be blank")
        return v

class PropertyOut(PropertyBase):
    id: int
    owner_id: int

    model_config = ConfigDict(from_attributes=True)

class PropertySearchFilters(BaseModel):
    """
    UC-03 Search filters (query params).
    We intentionally exclude owner_id and free-text search.
    """
    area: str | None = Field(default=None, min_length=1, description="Substring match against address")
    type: str | None = Field(default=None, min_length=1)

    min_size: float | None = Field(default=None, gt=0)
    max_size: float | None = Field(default=None, gt=0)
    min_price: float | None = Field(default=None, gt=0)
    max_price: float | None = Field(default=None, gt=0)

    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)

    @field_validator("area", "type", mode="before")
    @classmethod
    def strip_and_normalize(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v = v.strip()
        return v or None

    @model_validator(mode="after")
    def validate_ranges(self):
        # UC-03 A2: invalid ranges must be rejected (FastAPI -> 422)
        if self.min_price is not None and self.max_price is not None and self.min_price > self.max_price:
            raise ValueError("min_price must be <= max_price")
        if self.min_size is not None and self.max_size is not None and self.min_size > self.max_size:
            raise ValueError("min_size must be <= max_size")
        return self
    
class PropertySearchMeta(BaseModel):
    # FR-11 + UC-03 A1: metadata supports UI empty-state and paging UI
    total: int = Field(..., ge=0, description="Total matches ignoring offset/limit")
    count: int = Field(..., ge=0, description="Returned items in this page")
    offset: int = Field(..., ge=0)
    limit: int = Field(..., ge=1)


class PropertySearchResponse(BaseModel):
    meta: PropertySearchMeta
    items: list[PropertyOut]

    model_config = ConfigDict(from_attributes=True)