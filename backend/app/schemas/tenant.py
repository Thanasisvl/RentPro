from pydantic import BaseModel, EmailStr, ConfigDict, Field

class TenantBase(BaseModel):
    name: str
    afm: str = Field(..., pattern=r"^\d{9}$")
    phone: str | None = None
    email: EmailStr | None = None

class TenantCreate(TenantBase):
    pass

class TenantUpdate(BaseModel):
    name: str | None = None
    afm: str | None = Field(default=None, pattern=r"^\d{9}$")
    phone: str | None = None
    email: EmailStr | None = None

class TenantOut(TenantBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)