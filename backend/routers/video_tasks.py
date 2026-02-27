"""Video task routes."""
from fastapi import APIRouter, Depends

from models.content import VideoTaskCreate
from services.auth_service import get_current_user, get_client_id_from_user
from services.video_task_service import (
    create_video_task, get_video_task, save_video_as_asset
)
from db.mongo import video_tasks_collection

router = APIRouter(tags=["video"])


@router.get("/video-tasks")
async def get_video_tasks_list(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    db = video_tasks_collection()
    query = {"clientId": client_id} if client_id else {}
    return await db.find(query, {"_id": 0}).sort("createdAt", -1).to_list(100)


@router.post("/video-tasks")
async def create_video_task_route(data: VideoTaskCreate, user: dict = Depends(get_current_user)):
    """Create a new video generation task."""
    client_id = get_client_id_from_user(user)
    
    task = await create_video_task(client_id, {
        "provider": data.provider,
        "prompt": data.prompt,
        "mode": data.mode,
        "scriptText": data.scriptText,
        "audioAssetId": data.audioAssetId,
        "sourceAssetId": data.sourceAssetId,
        "aspectRatio": data.aspectRatio,
        "outputProfile": data.outputProfile,
        "submissionId": data.submissionId
    })
    
    return task


@router.get("/video-tasks/{task_id}")
async def get_video_task_route(task_id: str, user: dict = Depends(get_current_user)):
    """Get a video task and refresh its status from the provider."""
    client_id = get_client_id_from_user(user)
    return await get_video_task(client_id, task_id)


@router.post("/video-tasks/{task_id}/save-asset")
async def save_video_as_asset_route(task_id: str, user: dict = Depends(get_current_user)):
    """Save a completed video task as an asset."""
    client_id = get_client_id_from_user(user)
    asset = await save_video_as_asset(client_id, task_id)
    return {"message": "Video saved as asset", "asset": asset}
