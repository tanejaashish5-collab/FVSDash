"""
Pipeline API for ForgeVoice Studio.

Orchestrates the Script-to-Short pipeline:
Strategy Lab → AI Video Lab → Submissions → Publishing
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services.auth_service import get_current_user, get_client_id_from_user
from services.pipeline_service import (
    script_to_submission,
    submission_to_video,
    get_pipeline_status,
    get_pipeline_health,
    get_submission_for_video_lab,
    link_video_to_submission
)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class ScriptToSubmissionRequest(BaseModel):
    strategy_session_id: str


class SubmissionToVideoRequest(BaseModel):
    submission_id: str
    video_provider: str = "kling"


class LinkVideoRequest(BaseModel):
    submission_id: str
    video_asset_id: str


@router.post("/script-to-submission")
async def create_submission_from_script(
    request: ScriptToSubmissionRequest,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Create a submission from a Strategy Lab session.
    
    Extracts the script, outline, and metadata from the strategy session
    and creates a new submission with all fields pre-populated.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    result = await script_to_submission(
        user_id=user["id"],
        client_id=client_id,
        strategy_session_id=request.strategy_session_id
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Failed to create submission")
        )
    
    return result


@router.post("/submission-to-video")
async def create_video_from_submission(
    request: SubmissionToVideoRequest,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Trigger video generation for a submission.
    
    Creates a video task linked to the submission and sends it
    to the specified video provider for processing.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    result = await submission_to_video(
        user_id=user["id"],
        client_id=client_id,
        submission_id=request.submission_id,
        video_provider=request.video_provider
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Failed to create video task")
        )
    
    return result


@router.get("/status/{submission_id}")
async def get_submission_pipeline_status(
    submission_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get full pipeline status for a submission.
    
    Returns progress through: Script → Video → Thumbnail → Published
    with completion percentage and next step recommendation.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    result = await get_pipeline_status(
        client_id=client_id,
        submission_id=submission_id
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=404,
            detail=result.get("error", "Submission not found")
        )
    
    return result


@router.get("/health")
async def get_pipeline_health_overview(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get pipeline health overview.
    
    Returns counts of items at each stage:
    - Scripts awaiting video
    - Videos awaiting thumbnail
    - Ready to publish
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    return await get_pipeline_health(client_id)


@router.get("/submission-for-video/{submission_id}")
async def get_submission_for_video_generation(
    submission_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get submission data formatted for AI Video Lab.
    
    Returns the submission with its script content for
    pre-populating the video generation form.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    result = await get_submission_for_video_lab(
        client_id=client_id,
        submission_id=submission_id
    )
    
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )
    
    return result


class ProduceVideoRequest(BaseModel):
    submission_id: Optional[str] = None
    script: Optional[str] = None
    title: str
    format_type: str = "short"  # "short" or "longform"
    voice_id: Optional[str] = None


@router.post("/produce-video")
async def produce_full_video(
    request: ProduceVideoRequest,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Full video production pipeline: script → voiceover → AI clips → stitched MP4.

    Supports:
    - format_type "short": YouTube Shorts (9:16, 60-90s) — uses Veo clips throughout
    - format_type "longform": Long-form video (16:9, 5-10min) — AI images + Veo hero clips

    If submission_id is provided, fetches script from the submission.
    Otherwise uses the script field directly.
    """
    from services.video_production_service import produce_video
    from db.mongo import get_db

    client_id = get_client_id_from_user(user, impersonateClientId)
    script = request.script

    if request.submission_id and not script:
        db = get_db()
        submission = await db.submissions.find_one({"id": request.submission_id, "clientId": client_id})
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        script = submission.get("scriptText") or submission.get("description") or ""

    if not script:
        raise HTTPException(status_code=400, detail="script or submission_id with a script is required")

    import asyncio
    import uuid

    job_id = str(uuid.uuid4())[:8]

    # Run production in background task
    db = get_db()
    now_iso = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    job_doc = {
        "id": job_id,
        "clientId": client_id,
        "submissionId": request.submission_id,
        "title": request.title,
        "format": request.format_type,
        "status": "processing",
        "progress": 0,
        "step": "Starting",
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    await db.video_production_jobs.insert_one(job_doc)
    job_doc.pop("_id", None)

    async def run_production():
        async def status_cb(jid, step, progress):
            await db.video_production_jobs.update_one(
                {"id": jid},
                {"$set": {"step": step, "progress": progress, "updatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()}}
            )
        try:
            result = await produce_video(
                script=script,
                title=request.title,
                format_type=request.format_type,
                voice_id=request.voice_id,
                job_id=job_id,
                status_callback=status_cb
            )
            await db.video_production_jobs.update_one(
                {"id": job_id},
                {"$set": {"status": "complete", "progress": 100, "result": result, "videoUrl": result["url"]}}
            )
            # Link to submission if provided
            if request.submission_id:
                await db.submissions.update_one(
                    {"id": request.submission_id},
                    {"$set": {"producedVideoUrl": result["url"], "videoFormat": request.format_type}}
                )
        except Exception as e:
            await db.video_production_jobs.update_one(
                {"id": job_id},
                {"$set": {"status": "error", "error": str(e)}}
            )

    # Start production in background
    asyncio.create_task(run_production())

    return {
        "job_id": job_id,
        "status": "processing",
        "message": f"Video production started. Poll GET /pipeline/produce-video/{job_id} for status.",
        "format": request.format_type
    }


@router.get("/produce-video/{job_id}")
async def get_video_production_status(
    job_id: str,
    user: dict = Depends(get_current_user)
):
    """Poll video production job status."""
    from db.mongo import get_db
    db = get_db()
    job = await db.video_production_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Production job not found")
    return job


@router.post("/link-video")
async def link_video_asset_to_submission(
    request: LinkVideoRequest,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Link a generated video asset to its source submission.
    
    Called after video generation completes to associate
    the video with the original submission.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    result = await link_video_to_submission(
        client_id=client_id,
        submission_id=request.submission_id,
        video_asset_id=request.video_asset_id
    )
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Failed to link video")
        )
    
    return result
