from pydantic import BaseModel, ConfigDict, EmailStr

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str

class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    full_name: str | None = None
    role: str | None = None

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str