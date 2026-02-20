"""Submissions routes."""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
import uuid

from models.content import SubmissionCreate, SubmissionUpdate, StatusUpdate, PrimaryThumbnailUpdate
from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import submissions_collection, assets_collection

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


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Get a single submission by ID for deep-linking."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    query = {"id": submission_id}
    if client_id:
        query["clientId"] = client_id
    submission = await db.find_one(query, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


@router.post("/submissions")
async def create_submission(
    data: SubmissionCreate, 
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    from db.mongo import get_db
    from services import brain_service
    
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
        "strategyIdeaId": data.strategyIdeaId,  # Link to FVS idea if applicable
        "recommendation_id": data.recommendation_id,  # Link to AI recommendation for Brain tracking
        "createdAt": now,
        "updatedAt": now,
    }
    await db.insert_one(doc)
    doc.pop("_id", None)
    
    # Sprint 12: Create brain_scores record if recommendation_id is provided
    brain_score_id = None
    if data.recommendation_id:
        try:
            mongo_db = get_db()
            # Try to get recommendation details for predicted tier
            rec = await brain_service.get_recommendation_by_id(mongo_db, client_id)
            predicted_tier = "Medium"  # Default
            if rec:
                predicted_tier = rec.get("performanceTier", "Medium")
            
            brain_score = await brain_service.create_brain_score(
                mongo_db,
                user_id=client_id,
                recommendation_id=data.recommendation_id,
                submission_id=submission_id,
                predicted_tier=predicted_tier,
                predicted_title=data.title
            )
            brain_score_id = brain_score.get("id")
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Failed to create brain score: {e}")
    
    result = {**doc}
    if brain_score_id:
        result["brain_score_id"] = brain_score_id
    
    return result


@router.patch("/submissions/{submission_id}/status")
async def update_submission_status(
    submission_id: str, 
    data: StatusUpdate, 
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    from routers.notifications import create_notification
    from models.notification import NotificationType, NotificationPriority
    
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    query = {"id": submission_id}
    if client_id:
        query["clientId"] = client_id
    valid_statuses = ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Get submission details for notification
    submission = await db.find_one(query, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    old_status = submission.get("status", "INTAKE")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.update_one(query, {"$set": {"status": data.status, "updatedAt": now}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Create notification for status change
    try:
        # Determine priority based on status
        priority = NotificationPriority.HIGH if data.status == "PUBLISHED" else NotificationPriority.MEDIUM
        
        await create_notification(
            user_id=user["id"],
            notification_type=NotificationType.STATUS_CHANGE,
            title="Submission status updated",
            message=f'"{submission.get("title", "Untitled")}" moved from {old_status} to {data.status}',
            link=f"/dashboard/submissions?id={submission_id}",
            priority=priority
        )
    except Exception as e:
        # Don't fail the main operation if notification fails
        import logging
        logging.getLogger(__name__).warning(f"Failed to create status change notification: {e}")
    
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
    if data.primaryThumbnailAssetId is not None:
        update_fields["primaryThumbnailAssetId"] = data.primaryThumbnailAssetId if data.primaryThumbnailAssetId else None
    
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


@router.patch("/submissions/{submission_id}/primary-thumbnail")
async def set_primary_thumbnail(
    submission_id: str,
    data: PrimaryThumbnailUpdate,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Set the primary thumbnail for a submission.
    
    Validates that the asset exists, belongs to this submission, and is a Thumbnail type.
    Also updates the isPrimaryThumbnail flag on all related thumbnail assets.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    subs_db = submissions_collection()
    assets_db = assets_collection()
    
    # Build query
    sub_query = {"id": submission_id}
    if client_id:
        sub_query["clientId"] = client_id
    
    # Verify submission exists
    submission = await subs_db.find_one(sub_query, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Verify the asset exists and belongs to this submission
    asset = await assets_db.find_one(
        {"id": data.assetId, "submissionId": submission_id},
        {"_id": 0}
    )
    if not asset:
        raise HTTPException(status_code=404, detail="Thumbnail asset not found for this submission")
    
    if asset.get("type") != "Thumbnail":
        raise HTTPException(status_code=400, detail="Asset must be of type 'Thumbnail'")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update all thumbnails for this submission: set isPrimaryThumbnail=False
    await assets_db.update_many(
        {"submissionId": submission_id, "type": "Thumbnail"},
        {"$set": {"isPrimaryThumbnail": False, "updatedAt": now}}
    )
    
    # Set the selected thumbnail as primary
    await assets_db.update_one(
        {"id": data.assetId},
        {"$set": {"isPrimaryThumbnail": True, "updatedAt": now}}
    )
    
    # Update the submission with primaryThumbnailAssetId
    await subs_db.update_one(
        sub_query,
        {"$set": {"primaryThumbnailAssetId": data.assetId, "updatedAt": now}}
    )
    
    # Return updated submission with asset info
    updated_submission = await subs_db.find_one(sub_query, {"_id": 0})
    updated_asset = await assets_db.find_one({"id": data.assetId}, {"_id": 0})
    
    return {
        "message": "Primary thumbnail updated",
        "submission": updated_submission,
        "primaryThumbnail": updated_asset
    }


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
