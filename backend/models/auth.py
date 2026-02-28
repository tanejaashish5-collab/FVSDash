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
    onboardingComplete: bool = True  # Default True for backward compatibility


class TokenResponse(BaseModel):
    token: str
    user: UserResponse


class OnboardingUpdate(BaseModel):
    onboarding_complete: bool


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
