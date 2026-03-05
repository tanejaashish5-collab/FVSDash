"""
TikTok & Instagram publishing endpoints.
Mirrors the pattern from youtube_publish.py for each platform.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional, List
import uuid
import logging

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import (
    oauth_tokens_collection, publish_jobs_collection,
    submissions_collection, assets_collection
)
from routers.oauth import is_real_oauth_enabled

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/publish", tags=["publish"])


# ============================================================================
# Request Models
# ============================================================================

class TikTokPublishRequest(BaseModel):
    submissionId: str
    videoAssetId: str
    title: str = Field("", max_length=150)
    privacyLevel: str = Field("SELF_ONLY", pattern="^(SELF_ONLY|MUTUAL_FOLLOW_FRIENDS|FOLLOWER_OF_CREATOR|PUBLIC_TO_EVERYONE)$")

class InstagramPublishRequest(BaseModel):
    submissionId: str
    videoAssetId: str
    caption: str = Field("", max_length=2200)


# ============================================================================
# TikTok Publishing
# ============================================================================

@router.post("/tiktok")
async def publish_to_tiktok(
    data: TikTokPublishRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Upload a video to TikTok. Creates a publish job and processes in background."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    oauth_db = oauth_tokens_collection()
    jobs_db = publish_jobs_collection()
    subs_db = submissions_collection()
    assets_db = assets_collection()

    # Verify TikTok is connected
    token = await oauth_db.find_one({"clientId": client_id, "platform": "tiktok"})
    if not token or not token.get("connected"):
        raise HTTPException(status_code=400, detail="TikTok not connected. Connect in Settings first.")

    # Verify submission and video asset
    submission = await subs_db.find_one({"id": data.submissionId, "clientId": client_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    video_asset = await assets_db.find_one({"id": data.videoAssetId, "clientId": client_id}, {"_id": 0})
    if not video_asset:
        raise HTTPException(status_code=404, detail="Video asset not found")

    # Check for duplicate
    existing = await jobs_db.find_one({
        "submissionId": data.submissionId, "platform": "tiktok",
        "status": {"$in": ["live", "processing", "uploading"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Upload already in progress or published for TikTok")

    # Create publish job
    now = datetime.now(timezone.utc).isoformat()
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "clientId": client_id,
        "submissionId": data.submissionId,
        "platform": "tiktok",
        "status": "pending",
        "progress": 0,
        "title": data.title,
        "description": "",
        "tags": [],
        "privacyStatus": data.privacyLevel,
        "videoAssetId": data.videoAssetId,
        "videoAssetUrl": video_asset.get("url"),
        "platformVideoId": None,
        "platformUrl": None,
        "errorMessage": None,
        "createdAt": now,
        "updatedAt": now
    }
    await jobs_db.insert_one(job)

    background_tasks.add_task(process_tiktok_upload, job_id, client_id)

    return {"id": job_id, "submissionId": data.submissionId, "platform": "tiktok", "status": "pending", "progress": 0, "title": data.title, "createdAt": now}


async def process_tiktok_upload(job_id: str, client_id: str):
    """Background task for TikTok upload."""
    jobs_db = publish_jobs_collection()
    subs_db = submissions_collection()

    job = await jobs_db.find_one({"id": job_id})
    if not job:
        return

    try:
        await jobs_db.update_one({"id": job_id}, {"$set": {"status": "uploading", "updatedAt": datetime.now(timezone.utc).isoformat()}})

        # Get video file path
        from services.youtube_upload_service import get_video_asset_path
        video_path = await get_video_asset_path(job["videoAssetId"], client_id)

        if not video_path:
            await jobs_db.update_one({"id": job_id}, {"$set": {"status": "failed", "errorMessage": "Could not resolve video file", "updatedAt": datetime.now(timezone.utc).isoformat()}})
            return

        from services.tiktok_upload_service import upload_video_to_tiktok
        result = await upload_video_to_tiktok(
            client_id=client_id,
            job_id=job_id,
            video_file_path=video_path,
            title=job.get("title", ""),
            privacy_level=job.get("privacyStatus", "SELF_ONLY")
        )

        now = datetime.now(timezone.utc).isoformat()
        if result.get("success"):
            await jobs_db.update_one({"id": job_id}, {"$set": {
                "status": "live",
                "progress": 100,
                "platformVideoId": result.get("video_id"),
                "platformUrl": result.get("url"),
                "isMockUpload": result.get("is_mock", False),
                "publishedAt": now,
                "updatedAt": now
            }})
            await subs_db.update_one({"id": job["submissionId"]}, {"$set": {
                "tiktokVideoId": result.get("video_id"),
                "tiktokUrl": result.get("url"),
                "updatedAt": now
            }})
        else:
            await jobs_db.update_one({"id": job_id}, {"$set": {
                "status": "failed",
                "errorMessage": result.get("error", "Unknown error"),
                "updatedAt": now
            }})

    except Exception as e:
        logger.error(f"TikTok upload background error: {e}", exc_info=True)
        await jobs_db.update_one({"id": job_id}, {"$set": {"status": "failed", "errorMessage": str(e), "updatedAt": datetime.now(timezone.utc).isoformat()}})


# ============================================================================
# Instagram Reels Publishing
# ============================================================================

@router.post("/instagram")
async def publish_to_instagram(
    data: InstagramPublishRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Upload a Reel to Instagram. Creates a publish job and processes in background."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    oauth_db = oauth_tokens_collection()
    jobs_db = publish_jobs_collection()
    subs_db = submissions_collection()
    assets_db = assets_collection()

    # Verify Instagram is connected
    token = await oauth_db.find_one({"clientId": client_id, "platform": "instagram"})
    if not token or not token.get("connected"):
        raise HTTPException(status_code=400, detail="Instagram not connected. Connect in Settings first.")

    if not token.get("accountMeta", {}).get("igBusinessAccountId"):
        raise HTTPException(status_code=400, detail="No Instagram Business Account linked. Ensure your Facebook page has a connected Instagram Business/Creator account.")

    # Verify submission and video asset
    submission = await subs_db.find_one({"id": data.submissionId, "clientId": client_id}, {"_id": 0})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    video_asset = await assets_db.find_one({"id": data.videoAssetId, "clientId": client_id}, {"_id": 0})
    if not video_asset:
        raise HTTPException(status_code=404, detail="Video asset not found")

    # Instagram requires a publicly accessible URL for the video
    video_url = video_asset.get("url")
    if not video_url or not video_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Instagram requires a publicly accessible video URL. Please ensure the video is uploaded to cloud storage.")

    # Check for duplicate
    existing = await jobs_db.find_one({
        "submissionId": data.submissionId, "platform": "instagram",
        "status": {"$in": ["live", "processing", "uploading"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Upload already in progress or published for Instagram")

    # Create publish job
    now = datetime.now(timezone.utc).isoformat()
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "clientId": client_id,
        "submissionId": data.submissionId,
        "platform": "instagram",
        "status": "pending",
        "progress": 0,
        "title": "",
        "description": data.caption,
        "tags": [],
        "privacyStatus": "public",
        "videoAssetId": data.videoAssetId,
        "videoAssetUrl": video_url,
        "platformVideoId": None,
        "platformUrl": None,
        "errorMessage": None,
        "createdAt": now,
        "updatedAt": now
    }
    await jobs_db.insert_one(job)

    background_tasks.add_task(process_instagram_upload, job_id, client_id, video_url, data.caption)

    return {"id": job_id, "submissionId": data.submissionId, "platform": "instagram", "status": "pending", "progress": 0, "createdAt": now}


async def process_instagram_upload(job_id: str, client_id: str, video_url: str, caption: str):
    """Background task for Instagram Reel upload."""
    jobs_db = publish_jobs_collection()
    subs_db = submissions_collection()

    job = await jobs_db.find_one({"id": job_id})
    if not job:
        return

    try:
        await jobs_db.update_one({"id": job_id}, {"$set": {"status": "uploading", "updatedAt": datetime.now(timezone.utc).isoformat()}})

        from services.instagram_upload_service import upload_reel_to_instagram
        result = await upload_reel_to_instagram(
            client_id=client_id,
            job_id=job_id,
            video_url=video_url,
            caption=caption
        )

        now = datetime.now(timezone.utc).isoformat()
        if result.get("success"):
            await jobs_db.update_one({"id": job_id}, {"$set": {
                "status": "live",
                "progress": 100,
                "platformVideoId": result.get("media_id"),
                "platformUrl": result.get("url"),
                "isMockUpload": result.get("is_mock", False),
                "publishedAt": now,
                "updatedAt": now
            }})
            await subs_db.update_one({"id": job["submissionId"]}, {"$set": {
                "instagramMediaId": result.get("media_id"),
                "instagramUrl": result.get("url"),
                "updatedAt": now
            }})
        else:
            await jobs_db.update_one({"id": job_id}, {"$set": {
                "status": "failed",
                "errorMessage": result.get("error", "Unknown error"),
                "updatedAt": now
            }})

    except Exception as e:
        logger.error(f"Instagram upload background error: {e}", exc_info=True)
        await jobs_db.update_one({"id": job_id}, {"$set": {"status": "failed", "errorMessage": str(e), "updatedAt": datetime.now(timezone.utc).isoformat()}})
