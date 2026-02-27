"""
YouTube Video Upload Service - Sprint 14
Real YouTube upload using Google API Client.
"""
import os
import logging
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

from db.mongo import (
    oauth_tokens_collection, publish_jobs_collection, 
    submissions_collection, assets_collection
)

logger = logging.getLogger(__name__)

# YouTube API constants
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"
YOUTUBE_UPLOAD_SCOPE = "https://www.googleapis.com/auth/youtube.upload"

# Upload quota cost
YOUTUBE_UPLOAD_QUOTA_COST = 1600


async def get_youtube_credentials(user_id: str) -> Optional[Credentials]:
    """
    Get valid YouTube OAuth credentials for a user.
    Auto-refreshes if expired and refresh token is available.
    """
    oauth_db = oauth_tokens_collection()
    
    # Look up by user_id (clientId in the token record)
    token_record = await oauth_db.find_one({
        "clientId": user_id,
        "platform": "youtube",
        "connected": True
    }, {"_id": 0})
    
    if not token_record:
        logger.error(f"No YouTube token found for user {user_id}")
        return None
    
    access_token = token_record.get("accessToken")
    refresh_token = token_record.get("refreshToken")
    expires_at_str = token_record.get("expiresAt")
    
    if not access_token:
        logger.error("No access token in token record")
        return None
    
    # Parse expiry time
    expires_at = None
    if expires_at_str:
        try:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            expires_at = None
    
    # Check if token is expired and needs refresh
    now = datetime.now(timezone.utc)
    if expires_at and expires_at < now + timedelta(minutes=5):
        logger.info("Access token expired or expiring soon, attempting refresh...")
        
        if not refresh_token:
            logger.error("No refresh token available, cannot refresh")
            return None
        
        # Attempt to refresh the token
        try:
            from google.auth.transport.requests import Request
            
            creds = Credentials(
                token=access_token,
                refresh_token=refresh_token,
                token_uri="https://oauth2.googleapis.com/token",
                client_id=os.environ.get("YOUTUBE_CLIENT_ID"),
                client_secret=os.environ.get("YOUTUBE_CLIENT_SECRET")
            )
            
            creds.refresh(Request())
            
            # Update token in database
            new_expiry = datetime.now(timezone.utc) + timedelta(seconds=creds.expiry.timestamp() - datetime.now().timestamp() if creds.expiry else 3600)
            await oauth_db.update_one(
                {"clientId": user_id, "platform": "youtube"},
                {"$set": {
                    "accessToken": creds.token,
                    "expiresAt": new_expiry.isoformat(),
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info("Token refreshed successfully")
            return creds
            
        except Exception as e:
            logger.exception(f"Failed to refresh token: {e}")
            return None
    
    # Return valid credentials
    return Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get("YOUTUBE_CLIENT_ID"),
        client_secret=os.environ.get("YOUTUBE_CLIENT_SECRET")
    )


async def upload_video_to_youtube(
    user_id: str,
    job_id: str,
    video_file_path: str,
    title: str,
    description: str,
    tags: list,
    privacy_status: str = "private",
    category_id: str = "22",  # People & Blogs
    default_language: str = "hi"  # Hindi for Chanakya Sutra
) -> Dict[str, Any]:
    """
    Upload a video to YouTube using the YouTube Data API v3.
    
    Returns: {
        "success": bool,
        "video_id": str (if successful),
        "url": str (if successful),
        "error": str (if failed),
        "error_code": str (if failed)
    }
    """
    jobs_db = publish_jobs_collection()
    
    try:
        # Update job status to uploading
        await jobs_db.update_one(
            {"id": job_id},
            {"$set": {
                "status": "uploading",
                "progress": 0,
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Verify video file exists
        if not os.path.exists(video_file_path):
            return {
                "success": False,
                "error": "Video file not found",
                "error_code": "no_video_file"
            }
        
        # Get credentials
        credentials = await get_youtube_credentials(user_id)
        if not credentials:
            return {
                "success": False,
                "error": "YouTube not connected or token expired",
                "error_code": "auth_error"
            }
        
        # Build YouTube service
        youtube = build(
            YOUTUBE_API_SERVICE_NAME,
            YOUTUBE_API_VERSION,
            credentials=credentials,
            cache_discovery=False
        )
        
        # Prepare video metadata
        body = {
            "snippet": {
                "title": title[:100],  # YouTube title limit
                "description": description[:5000],  # YouTube description limit
                "tags": tags[:500] if tags else [],
                "categoryId": category_id,
                "defaultLanguage": default_language
            },
            "status": {
                "privacyStatus": privacy_status,
                "selfDeclaredMadeForKids": False
            }
        }
        
        # Create media upload
        media = MediaFileUpload(
            video_file_path,
            mimetype="video/mp4",
            chunksize=1024*1024,  # 1MB chunks
            resumable=True
        )
        
        # Create the upload request
        insert_request = youtube.videos().insert(
            part="snippet,status",
            body=body,
            media_body=media
        )
        
        # Execute upload with progress tracking
        response = None
        while response is None:
            try:
                status, response = insert_request.next_chunk()
                
                if status:
                    progress = int(status.progress() * 100)
                    await jobs_db.update_one(
                        {"id": job_id},
                        {"$set": {
                            "progress": progress,
                            "updatedAt": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    logger.info(f"Upload progress: {progress}%")
                
            except HttpError as e:
                if e.resp.status == 403:
                    # Quota exceeded
                    return {
                        "success": False,
                        "error": "YouTube API quota exceeded",
                        "error_code": "quota_exceeded",
                        "retry_after": "tomorrow"
                    }
                elif e.resp.status == 401:
                    return {
                        "success": False,
                        "error": "YouTube authentication failed",
                        "error_code": "auth_error"
                    }
                else:
                    raise
        
        # Upload successful
        video_id = response.get("id")
        video_url = f"https://youtube.com/shorts/{video_id}"
        
        logger.info(f"Video uploaded successfully: {video_id}")
        
        return {
            "success": True,
            "video_id": video_id,
            "url": video_url,
            "privacy_status": privacy_status
        }
        
    except HttpError as e:
        error_content = e.content.decode("utf-8") if e.content else str(e)
        logger.exception(f"YouTube API error: {error_content}")
        
        if e.resp.status == 403:
            return {
                "success": False,
                "error": "YouTube API quota exceeded",
                "error_code": "quota_exceeded",
                "retry_after": "tomorrow"
            }
        
        return {
            "success": False,
            "error": f"YouTube API error: {e.resp.status}",
            "error_code": "api_error"
        }
        
    except Exception as e:
        logger.exception(f"Upload error: {e}")
        return {
            "success": False,
            "error": str(e),
            "error_code": "upload_error"
        }


async def get_video_asset_path(asset_id: str, client_id: str) -> Optional[str]:
    """Get the file path for a video asset."""
    assets_db = assets_collection()
    
    asset = await assets_db.find_one({
        "id": asset_id,
        "clientId": client_id
    }, {"_id": 0})
    
    if not asset:
        return None
    
    # Check for local file path
    file_path = asset.get("filePath") or asset.get("localPath")
    if file_path and os.path.exists(file_path):
        return file_path
    
    # Check for URL - would need to download first
    url = asset.get("url")
    if url and not url.startswith("data:"):
        # For S3/external URLs, we'd need to download
        # For now, return None and handle in the caller
        return None
    
    return None


async def check_submission_has_video(submission_id: str, client_id: str) -> Dict[str, Any]:
    """
    Check if a submission has a video asset attached.
    Returns info about the video or error if not found.
    """
    subs_db = submissions_collection()
    assets_db = assets_collection()
    
    # Get submission
    submission = await subs_db.find_one({
        "id": submission_id,
        "clientId": client_id
    }, {"_id": 0})
    
    if not submission:
        return {
            "has_video": False,
            "error": "Submission not found"
        }
    
    # Check for video asset - either linked directly or via asset lookup
    video_asset_id = submission.get("videoAssetId")
    
    if video_asset_id:
        asset = await assets_db.find_one({
            "id": video_asset_id,
            "clientId": client_id,
            "assetType": {"$in": ["video", "Video"]}
        }, {"_id": 0})
        
        if asset:
            file_path = await get_video_asset_path(video_asset_id, client_id)
            return {
                "has_video": True,
                "asset_id": video_asset_id,
                "file_path": file_path,
                "asset": asset
            }
    
    # Check for any video asset linked to this submission
    video_asset = await assets_db.find_one({
        "clientId": client_id,
        "submissionId": submission_id,
        "assetType": {"$in": ["video", "Video"]}
    }, {"_id": 0})
    
    if video_asset:
        file_path = await get_video_asset_path(video_asset.get("id"), client_id)
        return {
            "has_video": True,
            "asset_id": video_asset.get("id"),
            "file_path": file_path,
            "asset": video_asset
        }
    
    return {
        "has_video": False,
        "error": "No video file attached to this submission",
        "can_use_test_upload": True
    }
