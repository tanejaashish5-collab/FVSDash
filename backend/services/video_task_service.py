"""Video task service - multi-provider video generation.

Supports real integration with Google Veo and mocked providers (Runway, Kling).
"""
import os
import uuid
import hashlib
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from dataclasses import dataclass
from fastapi import HTTPException

from db.mongo import video_tasks_collection, assets_collection

logger = logging.getLogger(__name__)

# Mock video URLs for fallback/testing
MOCK_VIDEO_URLS = [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
]


@dataclass
class VideoJobResult:
    """Result from video job creation."""
    job_id: str
    provider: str
    is_mocked: bool
    warning: Optional[str] = None


@dataclass
class VideoStatusResult:
    """Result from video status check."""
    status: str  # PROCESSING, READY, FAILED
    video_url: Optional[str] = None
    is_mocked: bool = False
    warning: Optional[str] = None


# =============================================================================
# GOOGLE VEO INTEGRATION (REAL)
# =============================================================================

async def create_veo_job(task_data: dict) -> VideoJobResult:
    """
    Create a video generation job with Google Veo.
    
    Uses google-genai SDK with VEO_API_KEY from environment.
    Falls back to mock if API key not configured or on error.
    
    Args:
        task_data: Dict with prompt, aspectRatio, etc.
        
    Returns:
        VideoJobResult with job ID and provider info
    """
    api_key = os.environ.get("VEO_API_KEY")
    
    if not api_key:
        logger.warning("VEO_API_KEY not configured. Using mocked video generation.")
        mock_job_id = f"veo-mock-{uuid.uuid4()}"
        return VideoJobResult(
            job_id=mock_job_id,
            provider="mock_veo",
            is_mocked=True,
            warning="VEO_API_KEY not configured. Using mock video generation."
        )
    
    try:
        from google import genai
        from google.genai import types
        
        # Initialize client with API key
        client = genai.Client(api_key=api_key)
        
        # Build prompt from task data
        prompt = task_data.get("prompt", "")
        if task_data.get("scriptText"):
            # If there's script text, enhance the prompt
            prompt = f"{prompt}\n\nScript context: {task_data.get('scriptText', '')[:500]}"
        
        # Map aspect ratio to Veo format
        aspect_ratio = task_data.get("aspectRatio", "16:9")
        veo_aspect = "16:9" if aspect_ratio == "16:9" else "9:16"
        
        logger.info(f"Submitting Veo video generation: prompt='{prompt[:100]}...', aspect={veo_aspect}")
        
        # Submit video generation job
        # NOTE: Using latest available Veo model
        operation = client.models.generate_videos(
            model="veo-2.0-generate-001",  # Use available Veo model
            prompt=prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio=veo_aspect,
                number_of_videos=1,
            ),
        )
        
        # Return the operation name as our job ID
        operation_name = operation.name if hasattr(operation, 'name') else str(uuid.uuid4())
        
        logger.info(f"Veo job submitted successfully: {operation_name}")
        
        return VideoJobResult(
            job_id=operation_name,
            provider="veo",
            is_mocked=False
        )
        
    except ImportError as e:
        logger.error(f"google-genai SDK not installed: {e}")
        mock_job_id = f"veo-mock-{uuid.uuid4()}"
        return VideoJobResult(
            job_id=mock_job_id,
            provider="mock_veo",
            is_mocked=True,
            warning="Google GenAI SDK not available. Using mock video generation."
        )
    except Exception as e:
        logger.error(f"Veo video generation failed: {e}")
        mock_job_id = f"veo-mock-{uuid.uuid4()}"
        return VideoJobResult(
            job_id=mock_job_id,
            provider="mock_veo",
            is_mocked=True,
            warning=f"Veo generation failed: {str(e)}. Using mock video."
        )


async def check_veo_job(job_id: str) -> VideoStatusResult:
    """
    Check status of a Google Veo video generation job.
    
    Args:
        job_id: The operation name/ID from Veo
        
    Returns:
        VideoStatusResult with status and video URL if ready
    """
    api_key = os.environ.get("VEO_API_KEY")
    
    # If it's a mock job, simulate completion
    if job_id.startswith("veo-mock-") or not api_key:
        hash_val = int(hashlib.md5(job_id.encode()).hexdigest()[:8], 16)
        # Simulate 33% completion rate on each poll
        if hash_val % 3 == 0:
            mock_url = MOCK_VIDEO_URLS[hash_val % len(MOCK_VIDEO_URLS)]
            return VideoStatusResult(
                status="READY",
                video_url=mock_url,
                is_mocked=True,
                warning="Using mock video (VEO_API_KEY not configured)"
            )
        else:
            return VideoStatusResult(
                status="PROCESSING",
                is_mocked=True
            )
    
    try:
        from google import genai
        
        client = genai.Client(api_key=api_key)
        
        # Get operation status
        operation = client.operations.get(job_id)
        
        if operation.done:
            # Job completed - check for video
            if hasattr(operation, 'response') and operation.response:
                if hasattr(operation.response, 'generated_videos') and operation.response.generated_videos:
                    video = operation.response.generated_videos[0]
                    video_url = None
                    
                    # Extract video URL from response
                    if hasattr(video, 'video'):
                        if hasattr(video.video, 'uri'):
                            video_url = video.video.uri
                        elif hasattr(video.video, 'url'):
                            video_url = video.video.url
                    
                    if video_url:
                        logger.info(f"Veo video ready: {video_url[:100]}...")
                        # TODO: P2 - Upload video to first-party storage (S3/GCS) 
                        # and return permanent URL instead of provider URL
                        return VideoStatusResult(
                            status="READY",
                            video_url=video_url,
                            is_mocked=False
                        )
                
            # Operation done but no video - treat as failed
            logger.warning(f"Veo operation completed but no video in response: {job_id}")
            return VideoStatusResult(
                status="FAILED",
                is_mocked=False,
                warning="Video generation completed but no video data returned"
            )
        else:
            # Still processing
            logger.info(f"Veo job still processing: {job_id}")
            return VideoStatusResult(
                status="PROCESSING",
                is_mocked=False
            )
            
    except Exception as e:
        logger.error(f"Failed to check Veo job status: {e}")
        # On error, fall back to mock behavior
        hash_val = int(hashlib.md5(job_id.encode()).hexdigest()[:8], 16)
        if hash_val % 3 == 0:
            mock_url = MOCK_VIDEO_URLS[hash_val % len(MOCK_VIDEO_URLS)]
            return VideoStatusResult(
                status="READY",
                video_url=mock_url,
                is_mocked=True,
                warning=f"Failed to check Veo status: {str(e)}. Using mock video."
            )
        return VideoStatusResult(
            status="PROCESSING",
            is_mocked=True,
            warning=f"Veo status check failed: {str(e)}"
        )


# =============================================================================
# PROVIDER ROUTING
# =============================================================================

async def create_video_job(provider: str, task_data: dict) -> VideoJobResult:
    """
    Create a video generation job with Veo.
    
    Args:
        provider: Video provider name (only 'veo' supported)
        task_data: Dict with prompt, mode, scriptText, aspectRatio
        
    Returns:
        VideoJobResult with job ID and metadata
    """
    if provider == "veo":
        return await create_veo_job(task_data)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown video provider: {provider}. Only 'veo' is supported.")


async def check_video_job(provider: str, job_id: str) -> VideoStatusResult:
    """
    Check status of a video generation job.
    
    Routes to appropriate provider implementation.
    
    Args:
        provider: Video provider name
        job_id: Provider-specific job ID
        
    Returns:
        VideoStatusResult with status and video URL if ready
    """
    if provider == "veo":
        return await check_veo_job(job_id)
    
    return VideoStatusResult(
        status="FAILED",
        is_mocked=True,
        warning=f"Unknown provider: {provider}. Only 'veo' is supported."
    )


async def create_video_task(client_id: str, data: dict) -> dict:
    """Create a new video generation task.
    
    Supports real Veo integration.
    """
    valid_providers = ["veo"]
    valid_modes = ["script", "audio", "remix"]
    valid_aspects = ["16:9", "9:16", "1:1"]
    valid_profiles = ["youtube_long", "shorts", "reel"]
    
    if data["provider"] not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Only 'veo' is supported.")
    if data["mode"] not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {valid_modes}")
    if data.get("aspectRatio", "16:9") not in valid_aspects:
        raise HTTPException(status_code=400, detail=f"Invalid aspect ratio. Must be one of: {valid_aspects}")
    if data.get("outputProfile", "youtube_long") not in valid_profiles:
        raise HTTPException(status_code=400, detail=f"Invalid output profile. Must be one of: {valid_profiles}")
    
    now = datetime.now(timezone.utc).isoformat()
    warnings = []
    
    # Create video job with provider
    job_result = await create_video_job(data["provider"], {
        "prompt": data["prompt"],
        "mode": data["mode"],
        "scriptText": data.get("scriptText"),
        "aspectRatio": data.get("aspectRatio", "16:9")
    })
    
    if job_result.warning:
        warnings.append(job_result.warning)
    
    task = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "provider": data["provider"],
        "providerJobId": job_result.job_id,
        "actualProvider": job_result.provider,  # Track actual provider used (may be mock)
        "prompt": data["prompt"],
        "mode": data["mode"],
        "scriptText": data.get("scriptText"),
        "audioAssetId": data.get("audioAssetId"),
        "sourceAssetId": data.get("sourceAssetId"),
        "aspectRatio": data.get("aspectRatio", "16:9"),
        "outputProfile": data.get("outputProfile", "youtube_long"),
        "submissionId": data.get("submissionId"),
        "status": "PROCESSING",
        "videoUrl": None,
        "isMocked": job_result.is_mocked,
        "warnings": warnings if warnings else None,
        "createdAt": now,
        "updatedAt": now
    }
    
    db = video_tasks_collection()
    await db.insert_one(task)
    if "_id" in task:
        del task["_id"]
    
    logger.info(f"Created video task: provider={data['provider']}, mocked={job_result.is_mocked}")
    
    return task


async def get_video_task(client_id: str, task_id: str) -> dict:
    """Get a video task and refresh its status from the provider.
    
    Polls the provider for status updates if task is still processing.
    """
    db = video_tasks_collection()
    query = {"id": task_id}
    if client_id:
        query["clientId"] = client_id
    
    task = await db.find_one(query, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Video task not found")
    
    # Check status with provider if still processing
    if task.get("status") == "PROCESSING":
        status_result = await check_video_job(
            task.get("provider"), 
            task.get("providerJobId")
        )
        
        # Update task if status changed
        if status_result.status != task["status"]:
            now = datetime.now(timezone.utc).isoformat()
            update = {
                "status": status_result.status,
                "videoUrl": status_result.video_url,
                "isMocked": status_result.is_mocked,
                "updatedAt": now
            }
            
            # Append any warnings
            if status_result.warning:
                existing_warnings = task.get("warnings") or []
                if status_result.warning not in existing_warnings:
                    update["warnings"] = existing_warnings + [status_result.warning]
            
            await db.update_one({"id": task_id}, {"$set": update})
            task.update(update)
            
            logger.info(f"Video task {task_id} status updated: {status_result.status}")
    
    return task


async def save_video_as_asset(client_id: str, task_id: str) -> dict:
    """Save a completed video task as an asset."""
    db = video_tasks_collection()
    assets_db = assets_collection()
    
    query = {"id": task_id}
    if client_id:
        query["clientId"] = client_id
    
    task = await db.find_one(query, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Video task not found")
    
    if task.get("status") != "READY" or not task.get("videoUrl"):
        raise HTTPException(status_code=400, detail="Video is not ready yet")
    
    now = datetime.now(timezone.utc).isoformat()
    
    asset = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "submissionId": task.get("submissionId"),
        "name": f"AI Video - {task.get('prompt', 'Untitled')[:50]}",
        "type": "Video",
        "url": task.get("videoUrl"),
        "status": "Draft",
        "sourceVideoTaskId": task_id,
        "createdAt": now,
        "updatedAt": now
    }
    
    await assets_db.insert_one(asset)
    if "_id" in asset:
        del asset["_id"]
    
    return asset
