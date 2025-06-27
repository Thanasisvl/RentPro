from pydantic import BaseModel, ConfigDict, EmailStr
from app.models.role import UserRole
from app.schemas.property import PropertyCreate, PropertyOut

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: UserRole = UserRole.USER

class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    full_name: str | None = None
    role: UserRole | None = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: UserRole

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class OwnerRegister(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    password: str
    property: PropertyCreate

class OwnerRegisterResponse(BaseModel):
    user: UserOut
    property: PropertyOut