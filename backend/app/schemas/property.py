from pydantic import BaseModel, ConfigDict, Field, field_validator
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