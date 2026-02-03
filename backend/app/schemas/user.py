from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models.role import UserRole


class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: UserRole = UserRole.USER

    @field_validator("role")
    @classmethod
    def disallow_admin(cls, v: UserRole) -> UserRole:
        # Δεν επιτρέπουμε εγγραφή ως ADMIN από το public API
        if v == UserRole.ADMIN:
            raise ValueError("Cannot register as ADMIN")
        return v


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
