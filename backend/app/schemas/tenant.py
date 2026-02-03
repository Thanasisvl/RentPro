from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime

class TenantBase(BaseModel):
    name: str
    afm: str = Field(..., pattern=r"^\d{9}$")
    phone: str | None = None
    email: EmailStr | None = None

class TenantCreate(TenantBase):
    owner_id: int | None = Field(default=None, ge=1)

class TenantUpdate(BaseModel):
    name: str | None = None
    afm: str | None = Field(default=None, pattern=r"^\d{9}$")
    phone: str | None = None
    email: EmailStr | None = None

class TenantOut(TenantBase):
    id: int
    owner_id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    created_by_id: int | None = None
    updated_by_id: int | None = None
    model_config = ConfigDict(from_attributes=True)