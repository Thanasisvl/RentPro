from pydantic import BaseModel, EmailStr, ConfigDict

class TenantBase(BaseModel):
    name: str
    afm: str
    phone: str | None = None
    email: EmailStr | None = None

class TenantCreate(TenantBase):
    user_id: int

class TenantUpdate(BaseModel):
    name: str | None = None
    afm: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    user_id: int | None = None

class TenantOut(TenantBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)