from pydantic import BaseModel, ConfigDict, Field

class PropertyBase(BaseModel):
    title: str
    description: str
    address: str
    type: str
    size: float = Field(..., gt=0)
    price: float = Field(..., gt=0)

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    address: str | None = None
    type: str | None = None
    size: float | None = Field(None, gt=0)
    price: float | None = Field(None, gt=0)

class PropertyOut(PropertyBase):
    id: int
    owner_id: int

    model_config = ConfigDict(from_attributes=True)