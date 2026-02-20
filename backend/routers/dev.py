"""
Developer Test Upload Endpoints - Sprint 14
Quick test video attachment for testing the publish flow.
"""
import os
import uuid
import subprocess
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import assets_collection, submissions_collection

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dev", tags=["dev"])

# Test video storage location
TEST_VIDEO_DIR = Path("/app/backend/assets/test_videos")
FALLBACK_TEST_VIDEO = Path("/app/backend/assets/test_video.mp4")


def is_dev_mode() -> bool:
    """Check if we're in development mode (not production)."""
    env = os.environ.get("APP_ENV", "development")
    return env != "production"


def get_ffmpeg_path() -> Optional[str]:
    """Check if ffmpeg is available."""
    try:
        result = subprocess.run(
            ["which", "ffmpeg"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def generate_test_video(output_path: str) -> bool:
    """
    Generate a minimal valid MP4 file using ffmpeg.
    1 second, black frame, silent audio.
    """
    ffmpeg_path = get_ffmpeg_path()
    
    if not ffmpeg_path:
        logger.warning("ffmpeg not available, cannot generate test video")
        return False
    
    try:
        # Create directory if needed
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Generate 1-second black video with silent audio
        result = subprocess.run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "color=c=black:s=1080x1920:d=1",  # 1 sec black vertical video
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",  # Silent audio
            "-t", "1",  # 1 second duration
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "51",  # Smallest possible
            "-c:a", "aac", "-b:a", "32k",
            "-shortest",
            "-pix_fmt", "yuv420p",
            output_path
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0 and os.path.exists(output_path):
            logger.info(f"Generated test video at {output_path}")
            return True
        else:
            logger.error(f"ffmpeg failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error("ffmpeg timed out")
        return False
    except Exception as e:
        logger.exception(f"Failed to generate test video: {e}")
        return False


@router.get("/test-upload/status")
async def get_test_upload_status():
    """
    Check if test upload feature is available.
    Only available in non-production environments.
    """
    if not is_dev_mode():
        return {
            "available": False,
            "reason": "Test upload not available in production"
        }
    
    ffmpeg_available = get_ffmpeg_path() is not None
    fallback_available = FALLBACK_TEST_VIDEO.exists()
    
    return {
        "available": True,
        "ffmpeg_available": ffmpeg_available,
        "fallback_available": fallback_available,
        "method": "ffmpeg_generated" if ffmpeg_available else ("fallback" if fallback_available else "none")
    }


@router.post("/test-upload/{submission_id}")
async def attach_test_video(
    submission_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Attach a minimal test video to a submission for testing the publish flow.
    Only available in non-production environments.
    
    Creates a 1-second black video with silent audio.
    """
    if not is_dev_mode():
        raise HTTPException(
            status_code=403,
            detail="Test upload not available in production"
        )
    
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    # Verify submission exists
    subs_db = submissions_collection()
    submission = await subs_db.find_one({
        "id": submission_id,
        "clientId": client_id
    }, {"_id": 0})
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check if submission already has a video asset
    assets_db = assets_collection()
    existing_video = await assets_db.find_one({
        "submissionId": submission_id,
        "clientId": client_id,
        "assetType": {"$in": ["video", "Video"]}
    }, {"_id": 0})
    
    if existing_video:
        return {
            "success": True,
            "message": "Submission already has a video attached",
            "asset_id": existing_video.get("id"),
            "existing": True
        }
    
    # Generate or use fallback test video
    TEST_VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    test_video_path = TEST_VIDEO_DIR / f"test_{submission_id}.mp4"
    
    video_generated = generate_test_video(str(test_video_path))
    
    if not video_generated:
        # Try fallback
        if FALLBACK_TEST_VIDEO.exists():
            # Copy fallback to submission-specific path
            import shutil
            shutil.copy(str(FALLBACK_TEST_VIDEO), str(test_video_path))
            logger.info("Using fallback test video")
        else:
            raise HTTPException(
                status_code=500,
                detail="Could not generate test video and no fallback available"
            )
    
    # Create asset record
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    asset = {
        "id": asset_id,
        "clientId": client_id,
        "submissionId": submission_id,
        "assetType": "video",
        "fileName": f"test_video_{submission_id[:8]}.mp4",
        "filePath": str(test_video_path),
        "localPath": str(test_video_path),
        "mimeType": "video/mp4",
        "fileSize": os.path.getsize(test_video_path),
        "isTestFile": True,  # Flag to identify test files
        "createdAt": now,
        "updatedAt": now
    }
    
    await assets_db.insert_one(asset)
    
    # Link asset to submission
    await subs_db.update_one(
        {"id": submission_id},
        {"$set": {
            "videoAssetId": asset_id,
            "hasTestVideo": True,
            "updatedAt": now
        }}
    )
    
    return {
        "success": True,
        "asset_id": asset_id,
        "submission_id": submission_id,
        "message": "Test video attached — ready to test publish flow",
        "file_path": str(test_video_path),
        "file_size": asset["fileSize"]
    }


@router.delete("/test-upload/{submission_id}")
async def remove_test_video(
    submission_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Remove test video from a submission."""
    if not is_dev_mode():
        raise HTTPException(
            status_code=403,
            detail="Test upload not available in production"
        )
    
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    assets_db = assets_collection()
    subs_db = submissions_collection()
    
    # Find and remove test video asset
    result = await assets_db.delete_one({
        "submissionId": submission_id,
        "clientId": client_id,
        "isTestFile": True
    })
    
    # Update submission
    await subs_db.update_one(
        {"id": submission_id},
        {"$set": {
            "videoAssetId": None,
            "hasTestVideo": False,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Clean up test file
    test_video_path = TEST_VIDEO_DIR / f"test_{submission_id}.mp4"
    if test_video_path.exists():
        test_video_path.unlink()
    
    return {
        "success": True,
        "deleted": result.deleted_count > 0
    }
