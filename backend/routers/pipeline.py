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
