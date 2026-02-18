"""Settings routes."""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid

from models.settings import SettingsUpdate
from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import client_settings_collection, clients_collection

router = APIRouter(tags=["settings"])


@router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    """
    Returns settings for the current client including ClientSettings and Client info.
    """
    client_id = get_client_id_from_user(user)
    if not client_id:
        return {}
    
    settings_db = client_settings_collection()
    clients_db = clients_collection()
    
    settings = await settings_db.find_one({"clientId": client_id}, {"_id": 0})
    client_info = await clients_db.find_one({"id": client_id}, {"_id": 0})
    
    return {
        "hourlyRate": settings.get("hourlyRate", 100) if settings else 100,
        "hoursPerEpisode": settings.get("hoursPerEpisode", 5) if settings else 5,
        "brandVoiceDescription": settings.get("brandVoiceDescription", "") if settings else "",
        "primaryContactName": client_info.get("primaryContactName", "") if client_info else "",
        "primaryContactEmail": client_info.get("primaryContactEmail", "") if client_info else "",
        "clientName": client_info.get("name", "") if client_info else "",
    }


@router.put("/settings")
async def update_settings(data: SettingsUpdate, user: dict = Depends(get_current_user)):
    """
    Updates settings for the current client.
    """
    client_id = get_client_id_from_user(user)
    if not client_id:
        raise HTTPException(status_code=400, detail="No client associated with user")
    
    settings_db = client_settings_collection()
    clients_db = clients_collection()
    
    now = datetime.now(timezone.utc).isoformat()
    
    if data.hourlyRate is not None and data.hourlyRate < 0:
        raise HTTPException(status_code=400, detail="Hourly rate must be non-negative")
    
    if data.hoursPerEpisode is not None and data.hoursPerEpisode <= 0:
        raise HTTPException(status_code=400, detail="Hours per episode must be positive")
    
    settings_update = {"updatedAt": now}
    if data.hourlyRate is not None:
        settings_update["hourlyRate"] = data.hourlyRate
    if data.hoursPerEpisode is not None:
        settings_update["hoursPerEpisode"] = data.hoursPerEpisode
    if data.brandVoiceDescription is not None:
        settings_update["brandVoiceDescription"] = data.brandVoiceDescription
    
    await settings_db.update_one(
        {"clientId": client_id},
        {"$set": settings_update, "$setOnInsert": {"id": str(uuid.uuid4()), "clientId": client_id, "createdAt": now}},
        upsert=True
    )
    
    client_update = {"updatedAt": now}
    if data.primaryContactName is not None:
        client_update["primaryContactName"] = data.primaryContactName
    if data.primaryContactEmail is not None:
        client_update["primaryContactEmail"] = data.primaryContactEmail
    
    if len(client_update) > 1:
        await clients_db.update_one({"id": client_id}, {"$set": client_update})
    
    return {"message": "Settings saved successfully"}


@router.get("/client-settings")
async def get_client_settings(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    if not client_id:
        return {}
    db = client_settings_collection()
    settings = await db.find_one({"clientId": client_id}, {"_id": 0})
    return settings or {}
