"""Authentication-related Pydantic models."""
from pydantic import BaseModel
from typing import Optional


class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "client"
    clientId: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    clientId: Optional[str] = None


class TokenResponse(BaseModel):
    token: str
    user: UserResponse
