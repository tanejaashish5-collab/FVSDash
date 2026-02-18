"""Authentication routes."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from models.auth import UserCreate, UserLogin, UserResponse, TokenResponse
from services.auth_service import (
    hash_password, verify_password, create_token, get_current_user
)
from db.mongo import users_collection

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(data: UserCreate):
    db = users_collection()
    existing = await db.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "id": user_id,
        "email": data.email,
        "passwordHash": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "clientId": data.clientId,
        "createdAt": now,
        "updatedAt": now
    }
    await db.insert_one(user_doc)

    token = create_token(user_id, data.email, data.role, data.clientId)
    return TokenResponse(
        token=token,
        user=UserResponse(id=user_id, email=data.email, name=data.name, role=data.role, clientId=data.clientId)
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    db = users_collection()
    user = await db.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["passwordHash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["email"], user["role"], user.get("clientId"))
    return TokenResponse(
        token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], clientId=user.get("clientId"))
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"], clientId=user.get("clientId"))
