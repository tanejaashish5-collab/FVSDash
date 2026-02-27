"""Help and Support routes."""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from models.help import SupportRequestCreate
from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import help_articles_collection, support_requests_collection

router = APIRouter(tags=["help"])


@router.get("/help/articles")
async def get_help_articles_list():
    """Returns all help articles (no client scoping - public content)."""
    db = help_articles_collection()
    return await db.find({}, {"_id": 0}).sort("createdAt", -1).to_list(100)


@router.get("/help/support")
async def get_support_requests_list(user: dict = Depends(get_current_user)):
    """Returns support requests for the current client (most recent first)."""
    client_id = get_client_id_from_user(user)
    db = support_requests_collection()
    query = {"clientId": client_id} if client_id else {}
    return await db.find(query, {"_id": 0}).sort("createdAt", -1).to_list(100)


@router.post("/help/support")
async def create_support_request(data: SupportRequestCreate, user: dict = Depends(get_current_user)):
    """Creates a new support request for the current client."""
    if not data.subject or not data.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if not data.message or not data.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    
    client_id = get_client_id_from_user(user)
    db = support_requests_collection()
    now = datetime.now(timezone.utc).isoformat()
    
    request = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "userEmail": user.get("email", ""),
        "subject": data.subject.strip(),
        "message": data.message.strip(),
        "status": "Open",
        "createdAt": now,
        "updatedAt": now
    }
    
    await db.insert_one(request)
    if "_id" in request:
        del request["_id"]
    
    return {"message": "Support request submitted successfully", "request": request}


# Legacy endpoints for backwards compatibility
@router.get("/help-articles")
async def get_help_articles():
    db = help_articles_collection()
    return await db.find({}, {"_id": 0}).to_list(100)


@router.get("/support-requests")
async def get_support_requests(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    db = support_requests_collection()
    query = {"clientId": client_id} if client_id else {}
    return await db.find(query, {"_id": 0}).to_list(100)
