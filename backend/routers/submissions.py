"""Submissions routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
import uuid

from models.content import SubmissionCreate, SubmissionUpdate, StatusUpdate
from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import submissions_collection

router = APIRouter(tags=["submissions"])


@router.get("/submissions")
async def get_submissions(
    user: dict = Depends(get_current_user), 
    status: Optional[str] = None, 
    content_type: Optional[str] = None,
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    query = {"clientId": client_id} if client_id else {}
    if status:
        query["status"] = status
    if content_type:
        query["contentType"] = content_type
    return await db.find(query, {"_id": 0}).sort("createdAt", -1).to_list(1000)


@router.post("/submissions")
async def create_submission(
    data: SubmissionCreate, 
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required to create submissions")
    
    db = submissions_collection()
    submission_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": submission_id,
        "clientId": client_id,
        "title": data.title,
        "guest": data.guest,
        "description": data.description,
        "contentType": data.contentType,
        "status": "INTAKE",
        "priority": data.priority,
        "releaseDate": data.releaseDate,
        "sourceFileUrl": data.sourceFileUrl,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/submissions/{submission_id}/status")
async def update_submission_status(
    submission_id: str, 
    data: StatusUpdate, 
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    query = {"id": submission_id}
    if client_id:
        query["clientId"] = client_id
    valid_statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.update_one(query, {"$set": {"status": data.status, "updatedAt": now}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    return {"message": f"Status updated to {data.status}", "status": data.status}


@router.patch("/submissions/{submission_id}")
async def update_submission(
    submission_id: str, 
    data: SubmissionUpdate, 
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    query = {"id": submission_id}
    if client_id:
        query["clientId"] = client_id
    
    update_fields = {}
    if data.status:
        valid_statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        update_fields["status"] = data.status
    if data.releaseDate is not None:
        update_fields["releaseDate"] = data.releaseDate if data.releaseDate else None
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_fields["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = await db.update_one(query, {"$set": update_fields})
    if result.modified_count == 0:
        existing = await db.find_one(query, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Submission not found")
    
    updated = await db.find_one(query, {"_id": 0})
    return updated


@router.get("/submissions/list")
async def get_submissions_list(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Returns a minimal list of submissions for dropdown/linking purposes"""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    query = {"clientId": client_id} if client_id else {}
    return await db.find(query, {"_id": 0, "id": 1, "title": 1, "contentType": 1}).to_list(1000)
