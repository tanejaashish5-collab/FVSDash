"""Video task service - Google Veo 3.1 only implementation.

Clean architecture with only Veo 3.1 for video generation.
All other providers (Kling, Runway, LTX) removed for simplicity.
"""
import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from dataclasses import dataclass
from fastapi import HTTPException

from db.mongo import video_tasks_collection, assets_collection

logger = logging.getLogger(__name__)


@dataclass
class VideoJobResult:
    """Result from video job creation."""
    job_id: str
    provider: str
    is_mocked: bool
    warning: Optional[str] = None
    video_url: Optional[str] = None


@dataclass
class VideoStatusResult:
    """Result from video status check."""
    status: str  # PROCESSING, READY, FAILED
    video_url: Optional[str] = None
    is_mocked: bool = False
    warning: Optional[str] = None


# =============================================================================
# CHANAKYA AESTHETIC ENFORCEMENT
# =============================================================================

def enforce_chanakya_aesthetic(prompt: str) -> str:
    """
    Ensure any prompt follows Chanakya/Mauryan/Ancient India aesthetic.

    Prevents:
    - Modern settings (offices, suits, smartphones)
    - Wrong historical periods (GOT, medieval Europe, HBO)
    - Generic business footage

    Args:
        prompt: User's raw prompt (could be title or partial description)

    Returns:
        Enhanced prompt with Mauryan aesthetic enforced
    """
    import random

    # Base Chanakya archetype (from CHANAKYA_CONTENT_ARCHETYPE.md)
    chanakya_base = "Ancient Indian sage Chanakya with white beard and saffron dhoti"

    setting_options = {
        "wealth": "ornate treasury room with gold coins and ancient scrolls",
        "enemy": "war council chamber with strategic maps and chess board",
        "wisdom": "scholar's study with palm leaf manuscripts and oil lamps",
        "power": "grand throne room with ornate Indian carvings",
        "strategy": "Mauryan palace courtyard with stone pillars",
        "default": "dimly lit study with ancient scrolls"
    }

    # Pick setting based on prompt theme
    prompt_lower = prompt.lower()
    if any(word in prompt_lower for word in ['wealth', 'money', 'tax', 'economy', 'coin']):
        setting = setting_options["wealth"]
    elif any(word in prompt_lower for word in ['enemy', 'rival', 'war', 'battle', 'fight']):
        setting = setting_options["enemy"]
    elif any(word in prompt_lower for word in ['wisdom', 'knowledge', 'learn', 'teach']):
        setting = setting_options["wisdom"]
    elif any(word in prompt_lower for word in ['power', 'king', 'leader', 'rule']):
        setting = setting_options["power"]
    elif any(word in prompt_lower for word in ['strategy', 'plan', 'tactic']):
        setting = setting_options["strategy"]
    else:
        setting = setting_options["default"]

    # Build enhanced prompt with Mauryan aesthetic
    enhanced = (
        f"{chanakya_base}, {setting}, "
        f"theme: {prompt}, "
        f"golden hour lighting, dramatic shadows, "
        f"cinematic 4K quality, Bollywood epic cinematography, "
        f"Indian aesthetic, traditional elements, "
        f"camera slowly zooms in"
    )

    return enhanced


# =============================================================================
# GOOGLE VEO 3.1 INTEGRATION (January 2026 Release)
# =============================================================================

async def create_veo_job(task_data: dict) -> VideoJobResult:
    """
    Create a video generation job with Google Veo 3.1.

    Uses the latest Veo 3.1 models released in January 2026:
    - veo-3.1-generate-preview (Standard quality)
    - veo-3.1-fast-generate-preview (Fast generation)

    Args:
        task_data: Dict with prompt, scriptText, aspectRatio, quality

    Returns:
        VideoJobResult with job ID and metadata
    """
    # Get API key (supports multiple env var names)
    api_key = (
        os.environ.get("VEO_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
    )

    if not api_key:
        logger.error("No Google API key found. Set GEMINI_API_KEY or VEO_API_KEY environment variable.")
        raise HTTPException(
            status_code=500,
            detail="Veo not configured. Set GEMINI_API_KEY environment variable."
        )

    try:
        from google import genai
        from google.genai import types

        # Initialize client with API key
        client = genai.Client(api_key=api_key)
        logger.info("Initialized Google GenAI client for Veo 3.1")

        # Build prompt from task data
        raw_prompt = task_data.get("prompt", "")
        script_text = task_data.get("scriptText", "")

        # Use script if available, otherwise use prompt
        if script_text and len(script_text) > 20:
            # For longer scripts, use first 500 chars as context
            base_prompt = f"{raw_prompt}\n\nScript: {script_text[:500]}"
        else:
            base_prompt = raw_prompt

        # Enforce Chanakya aesthetic for all videos
        enhanced_prompt = enforce_chanakya_aesthetic(base_prompt)
        logger.info(f"Enhanced prompt with Chanakya aesthetic: {enhanced_prompt[:150]}...")

        # Map aspect ratio to Veo format
        aspect_ratio = task_data.get("aspectRatio", "16:9")
        veo_aspect = "16:9" if aspect_ratio == "16:9" else "9:16"

        # ALWAYS use Veo 3.1 Fast model for consistent performance
        # Fast mode: 2x faster generation, still excellent quality
        model_name = "veo-3.1-fast-generate-preview"
        logger.info("Using Veo 3.1 Fast model (enforced default)")

        # Submit video generation job
        logger.info(f"Submitting Veo 3.1 video generation: model={model_name}, aspect={veo_aspect}")

        operation = client.models.generate_videos(
            model=model_name,
            prompt=enhanced_prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio=veo_aspect,
                number_of_videos=1,
                # Veo 3.1 requires duration between 4-8 seconds
                duration_seconds=8,  # Maximum allowed by Veo 3.1
            ),
        )

        # Return the operation name as our job ID
        operation_name = operation.name if hasattr(operation, 'name') else str(uuid.uuid4())

        logger.info(f"Veo 3.1 job submitted successfully: {operation_name}")

        return VideoJobResult(
            job_id=operation_name,
            provider="veo",
            is_mocked=False
        )

    except ImportError as e:
        logger.error(f"google-genai SDK not installed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Google GenAI SDK not available. Run: pip install google-genai==1.62.0"
        )
    except Exception as e:
        logger.error(f"Veo 3.1 video generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Veo generation failed: {str(e)}"
        )


async def check_veo_job(job_id: str) -> VideoStatusResult:
    """
    Check status of a Google Veo 3.1 video generation job.

    Args:
        job_id: The operation name/ID from Veo

    Returns:
        VideoStatusResult with status and video URL if ready
    """
    api_key = (
        os.environ.get("VEO_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
    )

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Veo not configured. Set GEMINI_API_KEY environment variable."
        )

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        # Get operation status - use the video-specific method
        operation = client.operations._get_videos_operation(operation_name=job_id)

        # Check if operation is done (it's a dict)
        if isinstance(operation, dict):
            is_done = operation.get('done', False)
        else:
            is_done = getattr(operation, 'done', False)

        if is_done:
            # Job completed - check for video
            video_url = None

            if isinstance(operation, dict):
                # Handle dict response from API
                response = operation.get('response', {})
                generated_videos = response.get('generatedVideos', [])

                if generated_videos:
                    video = generated_videos[0]
                    video_data = video.get('video', {})
                    video_url = video_data.get('uri') or video_data.get('url')
            else:
                # Handle object response (if API changes)
                if hasattr(operation, 'response') and operation.response:
                    if hasattr(operation.response, 'generated_videos') and operation.response.generated_videos:
                        video = operation.response.generated_videos[0]
                        if hasattr(video, 'video'):
                            if hasattr(video.video, 'uri'):
                                video_url = video.video.uri
                            elif hasattr(video.video, 'url'):
                                video_url = video.video.url

            if video_url:
                logger.info(f"Veo 3.1 video ready: {video_url[:100]}...")

                # Upload to first-party storage if configured
                from services.storage_service import get_storage_service
                try:
                    storage = get_storage_service()
                    # Download video from Veo URL
                    import httpx
                    async with httpx.AsyncClient() as http_client:
                        response = await http_client.get(video_url)
                        video_data = response.content

                    # Upload to our storage
                    upload_result = await storage.upload_file(
                        file_data=video_data,
                        folder="video_tasks",
                        filename=f"veo_{job_id[-12:]}.mp4",
                        content_type="video/mp4"
                    )
                    video_url = upload_result["url"]
                    logger.info(f"Video uploaded to storage: {video_url}")
                except Exception as e:
                    logger.warning(f"Could not upload to storage, using Veo URL: {e}")

                return VideoStatusResult(
                    status="READY",
                    video_url=video_url,
                    is_mocked=False
                )

            # Check if there's an error in the response
            has_error = False
            error_msg = None

            if isinstance(operation, dict):
                if operation.get('error'):
                    has_error = True
                    error_msg = str(operation.get('error'))

            if has_error:
                # Operation failed with error
                logger.error(f"Veo operation failed. Job ID: {job_id}, Error: {error_msg}")
                return VideoStatusResult(
                    status="FAILED",
                    is_mocked=False,
                    warning=f"Video generation failed: {error_msg}"
                )
            else:
                # Operation done but no video yet - might still be processing
                logger.info(f"Veo operation done but no video URL yet. Job ID: {job_id}")
                logger.debug(f"Operation response: {operation}")
                # Return PROCESSING to keep polling
                return VideoStatusResult(
                    status="PROCESSING",
                    is_mocked=False,
                    warning="Video is being finalized..."
                )
        else:
            # Still processing
            logger.info(f"Veo 3.1 job still processing: {job_id}")
            return VideoStatusResult(
                status="PROCESSING",
                is_mocked=False
            )

    except Exception as e:
        logger.error(f"Failed to check Veo job status: {e}")
        return VideoStatusResult(
            status="FAILED",
            is_mocked=False,
            warning=f"Status check failed: {str(e)}"
        )


# =============================================================================
# PUBLIC API
# =============================================================================

async def create_video_task(client_id: str, data: dict) -> dict:
    """Create a new video generation task with Veo 3.1.

    Simplified API with only Veo support for clean architecture.
    """
    valid_modes = ["script", "prompt"]
    valid_aspects = ["16:9", "9:16", "1:1"]
    valid_quality = ["standard", "fast"]

    # Validate input
    mode = data.get("mode", "prompt")
    if mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {valid_modes}")

    aspect_ratio = data.get("aspectRatio", "16:9")
    if aspect_ratio not in valid_aspects:
        raise HTTPException(status_code=400, detail=f"Invalid aspect ratio. Must be one of: {valid_aspects}")

    quality = data.get("quality", "standard")
    if quality not in valid_quality:
        raise HTTPException(status_code=400, detail=f"Invalid quality. Must be one of: {valid_quality}")

    now = datetime.now(timezone.utc).isoformat()

    # Create video job with Veo 3.1
    job_result = await create_veo_job({
        "prompt": data.get("prompt", ""),
        "scriptText": data.get("scriptText"),
        "aspectRatio": aspect_ratio,
        "quality": quality
    })

    # Check if video is ready (unlikely for Veo, usually async)
    if job_result.video_url:
        status = "READY"
        video_url = job_result.video_url
        logger.info(f"Video generated synchronously: {video_url}")
    else:
        status = "PROCESSING"
        video_url = None
        logger.info(f"Video generation started: {job_result.job_id}")

    task = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "provider": "veo",
        "providerJobId": job_result.job_id,
        "prompt": data.get("prompt", ""),
        "mode": mode,
        "scriptText": data.get("scriptText"),
        "aspectRatio": aspect_ratio,
        "quality": quality,
        "status": status,
        "videoUrl": video_url,
        "createdAt": now,
        "updatedAt": now
    }

    db = video_tasks_collection()
    await db.insert_one(task)
    if "_id" in task:
        del task["_id"]

    logger.info(f"Created Veo 3.1 video task: {task['id']}")

    return task


async def get_video_task(client_id: str, task_id: str) -> dict:
    """Get a video task and refresh its status from Veo.

    Polls Veo for status updates if task is still processing.
    """
    db = video_tasks_collection()
    query = {"id": task_id}
    if client_id:
        query["clientId"] = client_id

    task = await db.find_one(query, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Video task not found")

    # Check status with Veo if still processing
    if task.get("status") == "PROCESSING":
        status_result = await check_veo_job(task.get("providerJobId"))

        # Update task if status changed
        if status_result.status != task["status"]:
            now = datetime.now(timezone.utc).isoformat()
            update = {
                "status": status_result.status,
                "videoUrl": status_result.video_url,
                "updatedAt": now
            }

            # Add any warnings
            if status_result.warning:
                update["warning"] = status_result.warning

            await db.update_one({"id": task_id}, {"$set": update})
            task.update(update)

            logger.info(f"Video task {task_id} status updated: {status_result.status}")

    return task


async def list_video_tasks(client_id: str, limit: int = 10) -> list:
    """List recent video tasks for a client."""
    db = video_tasks_collection()
    cursor = db.find(
        {"clientId": client_id},
        {"_id": 0}
    ).sort("createdAt", -1).limit(limit)

    tasks = []
    async for task in cursor:
        tasks.append(task)

    return tasks


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
        "name": f"Veo 3.1 Video - {task.get('prompt', 'Untitled')[:50]}",
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