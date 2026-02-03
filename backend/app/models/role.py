from enum import Enum


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    OWNER = "OWNER"
    USER = "USER"
