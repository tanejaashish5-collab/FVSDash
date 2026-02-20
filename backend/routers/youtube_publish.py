"""
YouTube Publishing Service.
Handles video uploads to YouTube via Data API v3.
Includes mock implementation for sandbox environment.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
import secrets
import asyncio

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import (
    oauth_tokens_collection, publish_jobs_collection, 
    submissions_collection, assets_collection
)
from routers.oauth import get_quota_usage, consume_quota, MOCK_OAUTH_ENABLED

router = APIRouter(prefix="/publish", tags=["publish"])


# ============================================================================
# Models
# ============================================================================

class PublishRequest(BaseModel):
    submissionId: str
    videoAssetId: str
    title: str = Field(..., max_length=100)
    description: str = Field("", max_length=5000)
    tags: List[str] = Field(default_factory=list)
    privacyStatus: str = Field("public", pattern="^(public|unlisted|private)$")
    scheduledPublishAt: Optional[str] = None
    thumbnailAssetId: Optional[str] = None


class PublishJobStatus(BaseModel):
    id: str
    submissionId: str
    platform: str
    status: str  # pending, uploading, processing, live, failed, cancelled
    progress: int = 0  # 0-100
    platformVideoId: Optional[str] = None
    platformUrl: Optional[str] = None
    errorMessage: Optional[str] = None
    title: str
    scheduledAt: Optional[str] = None
    createdAt: str
    updatedAt: str


# Video upload cost in quota units
YOUTUBE_UPLOAD_QUOTA_COST = 1600


# ============================================================================
# Publishing Endpoints
# ============================================================================

@router.post("/youtube")
async def publish_to_youtube(
    data: PublishRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Upload a video to YouTube.
    Creates a publish job and processes in background.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    oauth_db = oauth_tokens_collection()
    jobs_db = publish_jobs_collection()
    subs_db = submissions_collection()
    assets_db = assets_collection()
    
    # Verify YouTube is connected
    token = await oauth_db.find_one({"clientId": client_id, "platform": "youtube"})
    if not token or not token.get("connected"):
        raise HTTPException(status_code=400, detail="YouTube not connected. Connect in Settings first.")
    
    # Check token expiry and auto-refresh if needed
    expires_at = token.get("expiresAt")
    if expires_at:
        expiry_time = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expiry_time < datetime.now(timezone.utc) + timedelta(minutes=5):
            # Token expired or expiring soon - attempt auto-refresh
            refresh_result = await auto_refresh_youtube_token(client_id)
            if not refresh_result.get("success"):
                raise HTTPException(
                    status_code=401, 
                    detail=f"YouTube token expired and refresh failed: {refresh_result.get('error')}. Please reconnect."
                )
    
    # Check quota
    quota = get_quota_usage(client_id)
    if quota["remaining"] < YOUTUBE_UPLOAD_QUOTA_COST:
        raise HTTPException(
            status_code=429, 
            detail=f"YouTube API quota exceeded. Used {quota['used']}/{quota['max']} units today. Resets at midnight PT."
        )
    
    # Verify submission exists
    submission = await subs_db.find_one({"id": data.submissionId, "clientId": client_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Verify video asset exists
    video_asset = await assets_db.find_one({"id": data.videoAssetId, "clientId": client_id}, {"_id": 0})
    if not video_asset:
        raise HTTPException(status_code=404, detail="Video asset not found. Please re-upload in Assets.")
    
    # Check video duration for Shorts (must be <= 180 seconds)
    duration = video_asset.get("duration", 0)
    if duration > 180:
        raise HTTPException(
            status_code=400, 
            detail=f"Video is {duration}s long. YouTube Shorts must be 3 minutes (180s) or less."
        )
    
    # Check for duplicate upload
    existing_job = await jobs_db.find_one({
        "submissionId": data.submissionId,
        "platform": "youtube",
        "status": {"$in": ["live", "processing", "uploading"]}
    })
    if existing_job:
        if existing_job.get("status") == "live":
            raise HTTPException(
                status_code=400, 
                detail=f"This submission is already published to YouTube. Video ID: {existing_job.get('platformVideoId')}"
            )
        raise HTTPException(status_code=400, detail="Upload already in progress for this submission")
    
    # Create publish job
    now = datetime.now(timezone.utc).isoformat()
    job_id = str(uuid.uuid4())
    
    job = {
        "id": job_id,
        "clientId": client_id,
        "submissionId": data.submissionId,
        "platform": "youtube",
        "status": "pending",
        "progress": 0,
        "title": data.title,
        "description": data.description,
        "tags": data.tags[:500] if data.tags else [],  # YouTube limit
        "privacyStatus": data.privacyStatus,
        "scheduledAt": data.scheduledPublishAt,
        "videoAssetId": data.videoAssetId,
        "videoAssetUrl": video_asset.get("url"),
        "thumbnailAssetId": data.thumbnailAssetId,
        "platformVideoId": None,
        "platformUrl": None,
        "errorMessage": None,
        "createdAt": now,
        "updatedAt": now
    }
    
    await jobs_db.insert_one(job)
    
    # Start background upload process
    background_tasks.add_task(process_youtube_upload, job_id, client_id)
    
    # Return job info (without internal fields)
    return {
        "id": job_id,
        "submissionId": data.submissionId,
        "platform": "youtube",
        "status": "pending",
        "progress": 0,
        "title": data.title,
        "scheduledAt": data.scheduledPublishAt,
        "createdAt": now
    }


async def process_youtube_upload(job_id: str, client_id: str):
    """
    Background task to process YouTube upload.
    Uses real YouTube API when OAuth is configured, falls back to mock for sandbox.
    """
    jobs_db = publish_jobs_collection()
    subs_db = submissions_collection()
    assets_db = assets_collection()
    
    try:
        # Get job details
        job = await jobs_db.find_one({"id": job_id}, {"_id": 0})
        if not job:
            return
        
        # Update status to uploading
        await jobs_db.update_one(
            {"id": job_id},
            {"$set": {"status": "uploading", "progress": 0, "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Check if we should use real YouTube upload
        use_real_upload = not MOCK_OAUTH_ENABLED
        
        if use_real_upload:
            # Real YouTube upload
            from services.youtube_upload_service import upload_video_to_youtube, get_video_asset_path
            
            # Get video file path
            video_asset_id = job.get("videoAssetId")
            video_path = await get_video_asset_path(video_asset_id, client_id) if video_asset_id else None
            
            if not video_path:
                raise Exception("Video file not found or not accessible")
            
            # Perform real upload
            result = await upload_video_to_youtube(
                user_id=client_id,
                job_id=job_id,
                video_file_path=video_path,
                title=job.get("title", "Untitled"),
                description=job.get("description", ""),
                tags=job.get("tags", []),
                privacy_status=job.get("privacyStatus", "private")
            )
            
            if result.get("success"):
                video_id = result["video_id"]
                video_url = result["url"]
            else:
                raise Exception(result.get("error", "Upload failed"))
        else:
            # Mock implementation for sandbox
            for progress in [10, 25, 45, 65, 85, 100]:
                await asyncio.sleep(0.5)  # Simulate upload time
                await jobs_db.update_one(
                    {"id": job_id},
                    {"$set": {"progress": progress, "updatedAt": datetime.now(timezone.utc).isoformat()}}
                )
            
            # Generate mock video ID and URL
            video_id = f"yt_{secrets.token_urlsafe(8)}"
            video_url = f"https://youtube.com/shorts/{video_id}"
        
        # Update to processing
        await jobs_db.update_one(
            {"id": job_id},
            {"$set": {"status": "processing", "progress": 100, "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Brief delay for YouTube processing
        await asyncio.sleep(1)
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Update job to live
        await jobs_db.update_one(
            {"id": job_id},
            {"$set": {
                "status": "live",
                "platformVideoId": video_id,
                "platformUrl": video_url,
                "publishedAt": now,
                "updatedAt": now,
                "isMockUpload": MOCK_OAUTH_ENABLED
            }}
        )
        
        # Update submission with YouTube info
        await subs_db.update_one(
            {"id": job["submissionId"]},
            {"$set": {
                "youtubeVideoId": video_id,
                "youtubeUrl": video_url,
                "publishedAt": now,
                "publishingStatus": "published"
            }}
        )
        
        # Consume quota
        consume_quota(client_id, YOUTUBE_UPLOAD_QUOTA_COST)
        
    except Exception as e:
        # Mark job as failed
        await jobs_db.update_one(
            {"id": job_id},
            {"$set": {
                "status": "failed",
                "errorMessage": str(e),
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )


@router.get("/status/{job_id}")
async def get_publish_status(
    job_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get the current status of a publish job.
    Used for polling upload progress.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publish_jobs_collection()
    
    job = await db.find_one({"id": job_id, "clientId": client_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Publish job not found")
    
    # Remove internal fields
    return {
        "id": job["id"],
        "submissionId": job["submissionId"],
        "platform": job["platform"],
        "status": job["status"],
        "progress": job.get("progress", 0),
        "platformVideoId": job.get("platformVideoId"),
        "platformUrl": job.get("platformUrl"),
        "errorMessage": job.get("errorMessage"),
        "title": job.get("title"),
        "scheduledAt": job.get("scheduledAt"),
        "publishedAt": job.get("publishedAt"),
        "createdAt": job["createdAt"],
        "updatedAt": job["updatedAt"]
    }


@router.get("/check-video/{submission_id}")
async def check_submission_video(
    submission_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Check if a submission has a video asset attached.
    Used by frontend to determine if publish is possible.
    """
    from services.youtube_upload_service import check_submission_has_video
    
    client_id = get_client_id_from_user(user, impersonateClientId)
    result = await check_submission_has_video(submission_id, client_id)
    
    return result




@router.get("/jobs")
async def list_publish_jobs(
    status: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    submissionId: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    List all publish jobs with optional filters.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publish_jobs_collection()
    
    query = {"clientId": client_id}
    if status:
        query["status"] = status
    if platform:
        query["platform"] = platform
    if submissionId:
        query["submissionId"] = submissionId
    
    jobs = await db.find(query, {"_id": 0}).sort("createdAt", -1).limit(limit).to_list(limit)
    
    return jobs


@router.post("/jobs/{job_id}/retry")
async def retry_failed_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Retry a failed publish job.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publish_jobs_collection()
    
    job = await db.find_one({"id": job_id, "clientId": client_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Publish job not found")
    
    if job.get("status") != "failed":
        raise HTTPException(status_code=400, detail="Only failed jobs can be retried")
    
    # Reset job status
    await db.update_one(
        {"id": job_id},
        {"$set": {
            "status": "pending",
            "progress": 0,
            "errorMessage": None,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Start background upload again
    background_tasks.add_task(process_youtube_upload, job_id, client_id)
    
    return {"success": True, "message": "Retry initiated"}


@router.delete("/jobs/{job_id}")
async def cancel_publish_job(
    job_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Cancel a pending or scheduled publish job.
    Cannot cancel jobs that are already uploading/processing/live.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publish_jobs_collection()
    
    job = await db.find_one({"id": job_id, "clientId": client_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Publish job not found")
    
    if job.get("status") in ["uploading", "processing", "live"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel job in {job['status']} status")
    
    await db.update_one(
        {"id": job_id},
        {"$set": {
            "status": "cancelled",
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Job cancelled"}


@router.get("/history")
async def get_publish_history(
    limit: int = Query(50, le=100),
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get publishing history (completed jobs).
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publish_jobs_collection()
    
    jobs = await db.find(
        {"clientId": client_id, "status": "live"},
        {"_id": 0}
    ).sort("publishedAt", -1).limit(limit).to_list(limit)
    
    return jobs


@router.get("/queue")
async def get_publish_queue(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get approved submissions that are ready to publish.
    Returns submissions with status SCHEDULED or PUBLISHED that haven't been uploaded yet.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    subs_db = submissions_collection()
    jobs_db = publish_jobs_collection()
    assets_db = assets_collection()
    
    # Get submissions that are ready for publishing
    submissions = await subs_db.find(
        {
            "clientId": client_id,
            "status": {"$in": ["SCHEDULED", "PUBLISHED", "DESIGN"]},
            "$or": [
                {"publishingStatus": {"$exists": False}},
                {"publishingStatus": None},
                {"publishingStatus": "pending"}
            ]
        },
        {"_id": 0}
    ).sort("releaseDate", 1).to_list(100)
    
    # Enrich with video asset info and existing job status
    result = []
    for sub in submissions:
        # Check if there's an existing publish job
        existing_job = await jobs_db.find_one(
            {"submissionId": sub["id"], "platform": "youtube"},
            {"_id": 0, "id": 1, "status": 1}
        )
        
        # Get video assets for this submission
        video_assets = await assets_db.find(
            {"submissionId": sub["id"], "type": "video"},
            {"_id": 0, "id": 1, "title": 1, "url": 1, "thumbnailUrl": 1, "duration": 1}
        ).to_list(10)
        
        # Get thumbnail assets
        thumbnail_assets = await assets_db.find(
            {"submissionId": sub["id"], "type": {"$in": ["image", "thumbnail"]}},
            {"_id": 0, "id": 1, "title": 1, "url": 1}
        ).to_list(10)
        
        result.append({
            **sub,
            "existingJob": existing_job,
            "videoAssets": video_assets,
            "thumbnailAssets": thumbnail_assets,
            "hasVideoAsset": len(video_assets) > 0
        })
    
    return result


@router.get("/stats")
async def get_publish_stats(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get publishing statistics.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publish_jobs_collection()
    
    jobs = await db.find({"clientId": client_id}, {"_id": 0, "status": 1}).to_list(1000)
    
    stats = {
        "total": len(jobs),
        "live": sum(1 for j in jobs if j.get("status") == "live"),
        "pending": sum(1 for j in jobs if j.get("status") == "pending"),
        "uploading": sum(1 for j in jobs if j.get("status") in ["uploading", "processing"]),
        "failed": sum(1 for j in jobs if j.get("status") == "failed"),
        "cancelled": sum(1 for j in jobs if j.get("status") == "cancelled")
    }
    
    # Get quota
    stats["quota"] = get_quota_usage(client_id)
    
    return stats
