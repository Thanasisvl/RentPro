from pydantic import BaseModel

class PropertyBase(BaseModel):
    title: str
    description: str
    address: str
    type: str
    size: float
    price: float

class PropertyCreate(PropertyBase):
    pass

class PropertyOut(PropertyBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True