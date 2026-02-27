"""
Pipeline Service - Sprint 15
Script-to-Short Pipeline: Strategy Lab → AI Video Lab → Submissions

This service orchestrates the content creation workflow:
1. Strategy Lab generates script
2. Script is converted to a submission
3. Submission goes to AI Video Lab for video generation
4. Video is linked back to submission
5. Submission is ready for publishing
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
    client_id: str,
    strategy_session_id: str,
) -> Dict[str, Any]:
    """
    Create a submission from a Strategy Lab session.
    Extracts script, outline, and metadata to pre-populate submission fields.
    
    Args:
        user_id: The user's ID
        client_id: The client's ID
        strategy_session_id: The strategy session ID
        
    Returns:
        Result dict with success status, submission_id, title, message
    """
    sessions_db = strategy_sessions_collection()
    subs_db = submissions_collection()
    
    # Fetch the strategy session
    session = await sessions_db.find_one(
        {"id": strategy_session_id},
        {"_id": 0}
    )
    
    if not session:
        return {
            "success": False,
            "error": "Strategy session not found"
        }
    
    # Verify ownership - check both camelCase and snake_case field names
    session_client_id = session.get("clientId") or session.get("client_id")
    session_user_id = session.get("userId") or session.get("user_id")
    if session_client_id != client_id and session_user_id != user_id and session_client_id != user_id and session_user_id != client_id:
        return {
            "success": False,
            "error": "Access denied to this strategy session"
        }
    
    # Extract content from session - check multiple possible field names
    script_content = (
        session.get("scriptContent") or 
        session.get("script") or 
        session.get("generatedScript") or
        ""
    )
    outline_content = (
        session.get("outlineContent") or 
        session.get("outline") or 
        session.get("generatedOutline") or
        ""
    )
    research_content = (
        session.get("researchContent") or 
        session.get("research") or 
        session.get("generatedResearch") or
        ""
    )
    topic = session.get("topic") or session.get("title") or "Untitled"
    
    # Handle outline as array or string
    if isinstance(outline_content, list):
        outline_text = "\n".join(outline_content)
    else:
        outline_text = str(outline_content)
    
    # Extract title from outline (first H1 or first line) or use topic
    title = topic
    if outline_text:
        lines = outline_text.strip().split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("# "):
                title = line[2:].strip()
                break
            elif line and not line.startswith("#"):
                title = line[:100]
                break
    
    # Extract hook (first ~50 words of script as hook/intro)
    hook = ""
    if script_content:
        words = script_content.split()[:50]
        hook = " ".join(words)
        if len(script_content.split()) > 50:
            hook += "..."
    
    # Generate description from research summary
    description = ""
    if research_content:
        # Take first 300 chars of research as description
        if isinstance(research_content, list):
            research_text = " ".join(str(r) for r in research_content)
        else:
            research_text = str(research_content)
        description = research_text[:300]
        if len(research_text) > 300:
            description += "..."
    
    # Generate hashtags from topic/title
    hashtags = []
    if topic:
        # Basic hashtag generation - extract meaningful words
        words = topic.replace("#", "").split()
        hashtags = [f"#{w.lower()}" for w in words[:5] if len(w) > 2 and w.isalnum()]
    
    # Add channel-specific hashtags
    hashtags.extend(["#ChanakyaNiti", "#StrategicWisdom", "#Shorts"])
    hashtags = list(dict.fromkeys(hashtags))[:10]  # Dedupe and limit
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create submission
    submission = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "userId": user_id,
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
    client_id: str,
    submission_id: str,
    video_provider: str = "kling"
) -> Dict[str, Any]:
    """
    Trigger video generation for a submission.
    Creates a video task and links it to the submission.
    
    Args:
        user_id: The user's ID
        client_id: The client's ID
        submission_id: The submission ID
        video_provider: Video generation provider (kling, runway, veo)
        
    Returns:
        Result dict with video_task_id, status, message
    """
    subs_db = submissions_collection()
    tasks_db = video_tasks_collection()
    
    # Fetch submission
    submission = await subs_db.find_one(
        {"id": submission_id, "clientId": client_id},
        {"_id": 0}
    )
    
    if not submission:
        return {
            "success": False,
            "error": "Submission not found"
        }
    
    # Build prompt from submission content
    script_content = submission.get("scriptContent") or submission.get("description") or ""
    title = submission.get("title", "")
    hook = submission.get("hook", "")
    
    # Combine into a prompt
    prompt_parts = []
    if title:
        prompt_parts.append(f"Title: {title}")
    if hook:
        prompt_parts.append(f"Hook: {hook}")
    if script_content:
        prompt_parts.append(f"Script: {script_content[:500]}")
    
    prompt = "\n\n".join(prompt_parts)
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create video task
    task = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "userId": user_id,
        "submissionId": submission_id,
        "provider": video_provider,
        "prompt": prompt[:1000],
        "status": "PENDING",
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


async def get_pipeline_status(client_id: str, submission_id: str) -> Dict[str, Any]:
    """
    Get full pipeline status for a submission.
    Shows progress through: Script → Video → Thumbnail → Published
    
    Args:
        client_id: The client's ID
        submission_id: The submission ID
        
    Returns:
        Pipeline status dict with completion percentage and next steps
    """
    subs_db = submissions_collection()
    assets_db = assets_collection()
    
    # Fetch submission
    submission = await subs_db.find_one(
        {"id": submission_id, "clientId": client_id},
        {"_id": 0}
    )
    
    if not submission:
        return {
            "success": False,
            "error": "Submission not found"
        }
    
    # Check for script content
    has_script = bool(
        submission.get("scriptContent") or 
        submission.get("strategySessionId") or
        submission.get("hook")
    )
    
    # Check for video asset
    video_asset = await assets_db.find_one({
        "submissionId": submission_id,
        "clientId": client_id,
        "assetType": {"$in": ["video", "Video", "mp4"]}
    }, {"_id": 0, "id": 1})
    has_video = bool(video_asset)
    
    # Check for thumbnail asset
    thumbnail_asset = await assets_db.find_one({
        "submissionId": submission_id,
        "clientId": client_id,
        "assetType": {"$in": ["thumbnail", "Thumbnail", "image", "Image", "png", "jpg"]}
    }, {"_id": 0, "id": 1})
    has_thumbnail = bool(thumbnail_asset)
    
    # Check if scheduled
    is_scheduled = (
        submission.get("status") == "SCHEDULED" or 
        bool(submission.get("releaseDate"))
    )
    
    # Check if published
    is_published = (
        submission.get("status") == "PUBLISHED" or 
        bool(submission.get("youtubeVideoId"))
    )
    
    # Calculate progress percentage (4 steps total)
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


async def get_pipeline_health(client_id: str) -> Dict[str, Any]:
    """
    Get pipeline health overview - counts of items at each stage.
    Used for the Overview page widget.
    
    Args:
        client_id: The client's ID
        
    Returns:
        Pipeline health stats with counts at each stage
    """
    subs_db = submissions_collection()
    assets_db = assets_collection()
    
    # Get all submissions from strategy lab that aren't published
    strategy_subs = await subs_db.find({
        "clientId": client_id,
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
            "clientId": client_id,
            "assetType": {"$in": ["video", "Video", "mp4"]}
        }, {"_id": 0, "id": 1})
        
        # Check for thumbnail
        thumbnail = await assets_db.find_one({
            "submissionId": sub_id,
            "clientId": client_id,
            "assetType": {"$in": ["thumbnail", "Thumbnail", "image", "Image"]}
        }, {"_id": 0, "id": 1})
        
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


async def get_submission_for_video_lab(
    client_id: str, 
    submission_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get submission data formatted for AI Video Lab pre-population.
    
    Args:
        client_id: The client's ID
        submission_id: The submission ID
        
    Returns:
        Submission data with script content or None
    """
    subs_db = submissions_collection()
    sessions_db = strategy_sessions_collection()
    
    # Fetch submission
    submission = await subs_db.find_one(
        {"id": submission_id, "clientId": client_id},
        {"_id": 0}
    )
    
    if not submission:
        return None
    
    # If has strategy session, fetch full script from there
    script_content = submission.get("scriptContent") or ""
    
    if not script_content and submission.get("strategySessionId"):
        session = await sessions_db.find_one(
            {"id": submission.get("strategySessionId")},
            {"_id": 0, "scriptContent": 1, "script": 1, "generatedScript": 1}
        )
        if session:
            script_content = (
                session.get("scriptContent") or 
                session.get("script") or 
                session.get("generatedScript") or
                ""
            )
    
    return {
        "id": submission.get("id"),
        "title": submission.get("title"),
        "hook": submission.get("hook"),
        "description": submission.get("description"),
        "scriptContent": script_content,
        "source": submission.get("source"),
        "contentType": submission.get("contentType")
    }


async def link_video_to_submission(
    client_id: str,
    submission_id: str,
    video_asset_id: str
) -> Dict[str, Any]:
    """
    Link a generated video asset to its source submission.
    
    Args:
        client_id: The client's ID
        submission_id: The submission ID
        video_asset_id: The video asset ID
        
    Returns:
        Result dict with success status
    """
    subs_db = submissions_collection()
    assets_db = assets_collection()
    
    # Verify submission exists
    submission = await subs_db.find_one(
        {"id": submission_id, "clientId": client_id},
        {"_id": 0, "id": 1}
    )
    
    if not submission:
        return {"success": False, "error": "Submission not found"}
    
    # Verify asset exists
    asset = await assets_db.find_one(
        {"id": video_asset_id, "clientId": client_id},
        {"_id": 0, "id": 1}
    )
    
    if not asset:
        return {"success": False, "error": "Asset not found"}
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update asset with submission link
    await assets_db.update_one(
        {"id": video_asset_id},
        {"$set": {
            "submissionId": submission_id,
            "updatedAt": now
        }}
    )
    
    # Update submission status if still in INTAKE
    await subs_db.update_one(
        {"id": submission_id, "status": "INTAKE"},
        {"$set": {
            "status": "EDITING",
            "updatedAt": now
        }}
    )
    
    logger.info(f"Linked video asset {video_asset_id} to submission {submission_id}")
    
    return {
        "success": True,
        "message": "Video linked to submission",
        "submission_id": submission_id,
        "video_asset_id": video_asset_id
    }
