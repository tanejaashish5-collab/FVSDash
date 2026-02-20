"""
Pipeline Service - Sprint 15
Script-to-Short Pipeline: Strategy Lab → AI Video Lab → Submissions
"""
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid

from db.mongo import (
    submissions_collection, strategy_sessions_collection,
    assets_collection, video_tasks_collection, fvs_recommendations_collection
)

logger = logging.getLogger(__name__)


async def script_to_submission(
    user_id: str,
    strategy_session_id: str,
    auto_create_submission: bool = True
) -> Dict[str, Any]:
    """
    Create a submission from a Strategy Lab session.
    Extracts script, outline, and metadata to pre-populate submission fields.
    """
    sessions_db = strategy_sessions_collection()
    subs_db = submissions_collection()
    
    # Fetch the strategy session
    session = await sessions_db.find_one(
        {"id": strategy_session_id, "clientId": user_id},
        {"_id": 0}
    )
    
    if not session:
        return {
            "success": False,
            "error": "Strategy session not found"
        }
    
    # Extract content from session
    script_content = session.get("scriptContent") or session.get("script") or ""
    outline_content = session.get("outlineContent") or session.get("outline") or ""
    research_content = session.get("researchContent") or session.get("research") or ""
    topic = session.get("topic") or session.get("title") or "Untitled"
    
    # Extract title from outline (first H1 or first line)
    title = topic
    if outline_content:
        lines = outline_content.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("# "):
                title = line[2:].strip()
                break
            elif line and not line.startswith("#"):
                title = line[:100]
                break
    
    # Extract hook (first 3 seconds worth of script - approx first 2 sentences)
    hook = ""
    if script_content:
        # Get first ~50 words as hook
        words = script_content.split()[:50]
        hook = " ".join(words)
        if len(words) == 50:
            hook += "..."
    
    # Generate description from research summary
    description = ""
    if research_content:
        # Take first 300 chars of research as description
        description = research_content[:300]
        if len(research_content) > 300:
            description += "..."
    
    # Generate hashtags from topic/title
    hashtags = []
    if topic:
        # Basic hashtag generation
        words = topic.replace("#", "").split()
        hashtags = [f"#{w.lower()}" for w in words[:5] if len(w) > 2]
    
    # Add Chanakya-specific hashtags
    hashtags.extend(["#ChanakyaNiti", "#StrategicWisdom", "#Shorts"])
    hashtags = list(set(hashtags))[:10]  # Dedupe and limit
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create submission
    submission = {
        "id": str(uuid.uuid4()),
        "clientId": user_id,
        "title": title[:200],  # Limit title length
        "description": description,
        "hook": hook,
        "hashtags": hashtags,
        "scriptContent": script_content,
        "contentType": "Short",
        "status": "INTAKE",
        "priority": "Medium",
        "source": "strategy_lab",
        "strategySessionId": strategy_session_id,
        "createdAt": now,
        "updatedAt": now
    }
    
    await subs_db.insert_one(submission)
    submission.pop("_id", None)
    
    logger.info(f"Created submission {submission['id']} from strategy session {strategy_session_id}")
    
    return {
        "success": True,
        "submission_id": submission["id"],
        "title": submission["title"],
        "message": "Submission created from your script"
    }


async def submission_to_video(
    user_id: str,
    submission_id: str,
    video_provider: str = "kling"
) -> Dict[str, Any]:
    """
    Trigger video generation for a submission.
    Links the video task to the submission.
    """
    subs_db = submissions_collection()
    tasks_db = video_tasks_collection()
    
    # Fetch submission
    submission = await subs_db.find_one(
        {"id": submission_id, "clientId": user_id},
        {"_id": 0}
    )
    
    if not submission:
        return {
            "success": False,
            "error": "Submission not found"
        }
    
    # Get script content
    script_content = submission.get("scriptContent") or submission.get("description") or ""
    prompt = f"{submission.get('title', '')}\n\n{script_content}"
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create video task
    task = {
        "id": str(uuid.uuid4()),
        "clientId": user_id,
        "submissionId": submission_id,
        "provider": video_provider,
        "prompt": prompt[:1000],
        "status": "pending",
        "source": "pipeline",
        "createdAt": now,
        "updatedAt": now
    }
    
    await tasks_db.insert_one(task)
    task.pop("_id", None)
    
    # Update submission with video task reference
    await subs_db.update_one(
        {"id": submission_id},
        {"$set": {
            "videoTaskId": task["id"],
            "updatedAt": now
        }}
    )
    
    logger.info(f"Created video task {task['id']} for submission {submission_id}")
    
    return {
        "success": True,
        "video_task_id": task["id"],
        "submission_id": submission_id,
        "status": "pending",
        "message": "Video generation queued"
    }


async def get_pipeline_status(user_id: str, submission_id: str) -> Dict[str, Any]:
    """
    Get full pipeline status for a submission.
    Shows progress through: Script → Video → Thumbnail → Published
    """
    subs_db = submissions_collection()
    assets_db = assets_collection()
    tasks_db = video_tasks_collection()
    
    # Fetch submission
    submission = await subs_db.find_one(
        {"id": submission_id, "clientId": user_id},
        {"_id": 0}
    )
    
    if not submission:
        return {
            "success": False,
            "error": "Submission not found"
        }
    
    # Check for script
    has_script = bool(submission.get("scriptContent") or submission.get("strategySessionId"))
    
    # Check for video asset
    video_asset = await assets_db.find_one({
        "submissionId": submission_id,
        "clientId": user_id,
        "assetType": {"$in": ["video", "Video"]}
    }, {"_id": 0, "id": 1})
    has_video = bool(video_asset)
    
    # Check for thumbnail asset
    thumbnail_asset = await assets_db.find_one({
        "submissionId": submission_id,
        "clientId": user_id,
        "assetType": {"$in": ["thumbnail", "Thumbnail", "image", "Image"]}
    }, {"_id": 0, "id": 1})
    has_thumbnail = bool(thumbnail_asset)
    
    # Check if scheduled
    is_scheduled = submission.get("status") == "SCHEDULED" or bool(submission.get("releaseDate"))
    
    # Check if published
    is_published = submission.get("status") == "PUBLISHED" or bool(submission.get("youtubeVideoId"))
    
    # Calculate progress percentage
    steps_complete = sum([has_script, has_video, has_thumbnail, is_published])
    total_steps = 4
    pipeline_complete_percent = int((steps_complete / total_steps) * 100)
    
    # Determine next step
    next_step = ""
    next_step_url = ""
    
    if not has_script:
        next_step = "Create script in Strategy Lab"
        next_step_url = "/dashboard/strategy"
    elif not has_video:
        next_step = "Generate video in AI Video Lab"
        next_step_url = f"/dashboard/video-lab?submission_id={submission_id}"
    elif not has_thumbnail:
        next_step = "Create thumbnail in Assets"
        next_step_url = "/dashboard/assets"
    elif not is_published:
        next_step = "Publish to YouTube"
        next_step_url = "/dashboard/publishing"
    else:
        next_step = "All steps complete!"
        next_step_url = "/dashboard/analytics"
    
    return {
        "success": True,
        "submission_id": submission_id,
        "title": submission.get("title"),
        "source": submission.get("source"),
        "has_script": has_script,
        "has_video": has_video,
        "has_thumbnail": has_thumbnail,
        "is_scheduled": is_scheduled,
        "is_published": is_published,
        "pipeline_complete_percent": pipeline_complete_percent,
        "next_step": next_step,
        "next_step_url": next_step_url
    }


async def get_pipeline_health(user_id: str) -> Dict[str, Any]:
    """
    Get pipeline health overview - counts of items at each stage.
    Used for the Overview page widget.
    """
    subs_db = submissions_collection()
    assets_db = assets_collection()
    
    # Get all submissions from strategy lab that aren't published
    strategy_subs = await subs_db.find({
        "clientId": user_id,
        "source": "strategy_lab",
        "status": {"$ne": "PUBLISHED"}
    }, {"_id": 0, "id": 1, "status": 1}).to_list(100)
    
    scripts_awaiting_video = 0
    videos_awaiting_thumbnail = 0
    ready_to_publish = 0
    
    for sub in strategy_subs:
        sub_id = sub.get("id")
        
        # Check for video
        video = await assets_db.find_one({
            "submissionId": sub_id,
            "clientId": user_id,
            "assetType": {"$in": ["video", "Video"]}
        })
        
        # Check for thumbnail
        thumbnail = await assets_db.find_one({
            "submissionId": sub_id,
            "clientId": user_id,
            "assetType": {"$in": ["thumbnail", "Thumbnail", "image", "Image"]}
        })
        
        if not video:
            scripts_awaiting_video += 1
        elif not thumbnail:
            videos_awaiting_thumbnail += 1
        else:
            ready_to_publish += 1
    
    return {
        "scripts_awaiting_video": scripts_awaiting_video,
        "videos_awaiting_thumbnail": videos_awaiting_thumbnail,
        "ready_to_publish": ready_to_publish,
        "total_in_pipeline": len(strategy_subs)
    }
