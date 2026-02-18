"""Video task service - multi-provider video generation."""
import uuid
import hashlib
from datetime import datetime, timezone
from fastapi import HTTPException

from db.mongo import video_tasks_collection, assets_collection


async def create_video_job(provider: str, task_data: dict) -> str:
    """Create a video generation job with the specified provider (MOCKED)."""
    # TODO: Integrate real video providers (Runway, Veo) here
    if provider == "kling":
        return f"kling-mock-{uuid.uuid4()}"
    elif provider == "runway":
        return f"runway-mock-{uuid.uuid4()}"
    elif provider == "veo":
        return f"veo-mock-{uuid.uuid4()}"
    else:
        raise HTTPException(status_code=400, detail=f"Unknown video provider: {provider}")


async def check_video_job(provider: str, job_id: str) -> dict:
    """Check status of a video generation job (MOCKED)."""
    # TODO: Integrate real provider status checks here
    hash_val = int(hashlib.md5(job_id.encode()).hexdigest()[:8], 16)
    
    if provider == "kling":
        return {
            "status": "READY",
            "videoUrl": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
        }
    elif provider in ["runway", "veo"]:
        if hash_val % 3 == 0:
            return {
                "status": "READY", 
                "videoUrl": "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
            }
        else:
            return {"status": "PROCESSING", "videoUrl": None}
    
    return {"status": "FAILED", "videoUrl": None}


async def create_video_task(client_id: str, data: dict) -> dict:
    """Create a new video generation task."""
    valid_providers = ["runway", "veo", "kling"]
    valid_modes = ["script", "audio", "remix"]
    valid_aspects = ["16:9", "9:16", "1:1"]
    valid_profiles = ["youtube_long", "shorts", "reel"]
    
    if data["provider"] not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    if data["mode"] not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {valid_modes}")
    if data.get("aspectRatio", "16:9") not in valid_aspects:
        raise HTTPException(status_code=400, detail=f"Invalid aspect ratio. Must be one of: {valid_aspects}")
    if data.get("outputProfile", "youtube_long") not in valid_profiles:
        raise HTTPException(status_code=400, detail=f"Invalid output profile. Must be one of: {valid_profiles}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    provider_job_id = await create_video_job(data["provider"], {
        "prompt": data["prompt"],
        "mode": data["mode"],
        "scriptText": data.get("scriptText"),
        "aspectRatio": data.get("aspectRatio", "16:9")
    })
    
    task = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "provider": data["provider"],
        "providerJobId": provider_job_id,
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
        "createdAt": now,
        "updatedAt": now
    }
    
    db = video_tasks_collection()
    await db.insert_one(task)
    if "_id" in task:
        del task["_id"]
    
    return task


async def get_video_task(client_id: str, task_id: str) -> dict:
    """Get a video task and refresh its status from the provider."""
    db = video_tasks_collection()
    query = {"id": task_id}
    if client_id:
        query["clientId"] = client_id
    
    task = await db.find_one(query, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Video task not found")
    
    # Check status with provider if still processing
    if task.get("status") == "PROCESSING":
        provider_status = await check_video_job(task.get("provider"), task.get("providerJobId"))
        
        if provider_status["status"] != task["status"]:
            now = datetime.now(timezone.utc).isoformat()
            update = {
                "status": provider_status["status"],
                "videoUrl": provider_status.get("videoUrl"),
                "updatedAt": now
            }
            await db.update_one({"id": task_id}, {"$set": update})
            task.update(update)
    
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
