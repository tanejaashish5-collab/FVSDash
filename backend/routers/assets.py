"""Assets routes."""
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, Form
from datetime import datetime, timezone
from typing import Optional
import uuid

from models.content import AssetStatusUpdate, AssetSubmissionUpdate
from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import assets_collection, submissions_collection

router = APIRouter(tags=["assets"])


@router.get("/assets")
async def get_assets(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = assets_collection()
    query = {"clientId": client_id} if client_id else {}
    return await db.find(query, {"_id": 0}).to_list(1000)


@router.get("/assets/library")
async def get_assets_library(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    assets_db = assets_collection()
    submissions_db = submissions_collection()
    query = {"clientId": client_id} if client_id else {}
    
    assets = await assets_db.find(query, {"_id": 0}).to_list(1000)
    
    submission_ids = list(set(a.get("submissionId") for a in assets if a.get("submissionId")))
    
    submissions_map = {}
    if submission_ids:
        submissions = await submissions_db.find(
            {"id": {"$in": submission_ids}}, 
            {"_id": 0, "id": 1, "title": 1}
        ).to_list(1000)
        submissions_map = {s["id"]: s for s in submissions}
    
    enriched_assets = []
    for asset in assets:
        sub = submissions_map.get(asset.get("submissionId"), {})
        enriched_assets.append({
            **asset,
            "episodeTitle": sub.get("title") if asset.get("submissionId") else None
        })
    
    return enriched_assets


@router.patch("/assets/{asset_id}/status")
async def update_asset_status(
    asset_id: str, 
    data: AssetStatusUpdate, 
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = assets_collection()
    query = {"id": asset_id}
    if client_id:
        query["clientId"] = client_id
    
    valid_statuses = ["Draft", "Final"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc).isoformat()
    result = await db.update_one(query, {"$set": {"status": data.status, "updatedAt": now}})
    if result.modified_count == 0:
        existing = await db.find_one(query, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Asset not found")
    
    return {"message": f"Asset status updated to {data.status}", "status": data.status}


@router.patch("/assets/{asset_id}/submission")
async def update_asset_submission(
    asset_id: str, 
    data: AssetSubmissionUpdate, 
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    assets_db = assets_collection()
    submissions_db = submissions_collection()
    query = {"id": asset_id}
    if client_id:
        query["clientId"] = client_id
    
    if data.submissionId:
        sub_query = {"id": data.submissionId}
        if client_id:
            sub_query["clientId"] = client_id
        submission = await submissions_db.find_one(sub_query, {"_id": 0})
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found or access denied")
    
    now = datetime.now(timezone.utc).isoformat()
    result = await assets_db.update_one(query, {"$set": {"submissionId": data.submissionId, "updatedAt": now}})
    if result.modified_count == 0:
        existing = await assets_db.find_one(query, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Asset not found")
    
    return {"message": "Asset submission updated", "submissionId": data.submissionId}


@router.post("/assets/upload")
async def upload_asset(
    file: UploadFile = File(...),
    assetType: str = Form("Other"),
    submissionId: Optional[str] = Form(None),
    user: dict = Depends(get_current_user)
):
    """Upload an asset file and create an asset record."""
    from services.storage_service import get_storage_service
    storage = get_storage_service()
    file_data = await file.read()
    result = await storage.upload_file(
        file_data=file_data,
        folder=f"assets/{assetType.lower()}",
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream"
    )
    client_id = get_client_id_from_user(user)
    db = assets_collection()
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": asset_id,
        "clientId": client_id,
        "type": assetType,
        "name": file.filename,
        "filename": file.filename,
        "url": result["url"],
        "fileUrl": result["url"],
        "status": "Draft",
        "submissionId": submissionId,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.insert_one(doc)
    doc.pop("_id", None)
    return doc
