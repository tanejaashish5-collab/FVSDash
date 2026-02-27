"""Admin service - client management and impersonation logic."""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import HTTPException
import uuid

from db.mongo import (
    clients_collection, submissions_collection, assets_collection,
    analytics_snapshots_collection, billing_records_collection,
    users_collection, channel_profiles_collection, oauth_tokens_collection,
    channel_snapshots_collection
)
from services.auth_service import hash_password


async def get_all_clients_with_metrics() -> List[dict]:
    """Get all clients with their key metrics (submission count, last activity, YouTube status)."""
    clients_db = clients_collection()
    users_db = users_collection()
    submissions_db = submissions_collection()
    oauth_db = oauth_tokens_collection()
    snapshots_db = channel_snapshots_collection()
    
    # Get all client users (not admin users)
    users = await users_db.find(
        {"role": "client"},
        {"_id": 0, "id": 1, "name": 1, "full_name": 1, "email": 1, "clientId": 1, "is_active": 1}
    ).to_list(1000)
    
    enriched_clients = []
    for user in users:
        client_id = user.get("clientId")
        if not client_id:
            continue
        
        # Get client record
        client = await clients_db.find_one({"id": client_id}, {"_id": 0})
        
        # Get submission count and last activity
        submissions = await submissions_db.find(
            {"clientId": client_id}, 
            {"_id": 0, "updatedAt": 1, "createdAt": 1}
        ).to_list(1000)
        
        last_activity = None
        if submissions:
            dates = [s.get("updatedAt") or s.get("createdAt") for s in submissions if s.get("updatedAt") or s.get("createdAt")]
            if dates:
                last_activity = max(dates)
        
        # Check YouTube connection
        oauth_token = await oauth_db.find_one(
            {"clientId": client_id, "platform": "youtube", "connected": True},
            {"_id": 0}
        )
        youtube_connected = oauth_token is not None
        
        # Get channel snapshot for subscriber count
        snapshot = await snapshots_db.find_one(
            {"clientId": client_id},
            {"_id": 0, "subscriberCount": 1, "channelName": 1},
            sort=[("date", -1)]
        )
        
        enriched_clients.append({
            "id": client_id,
            "name": user.get("full_name") or user.get("name") or client.get("name", "Unknown") if client else user.get("name", "Unknown"),
            "primaryContactName": user.get("full_name") or user.get("name"),
            "primaryContactEmail": user.get("email"),
            "plan": client.get("plan", "Free") if client else "Free",
            "status": "Active" if user.get("is_active", True) else "Inactive",
            "submissionsCount": len(submissions),
            "lastActivityDate": last_activity,
            # Sprint 12 additions
            "channel_name": snapshot.get("channelName") if snapshot else None,
            "subscriber_count": snapshot.get("subscriberCount") if snapshot else None,
            "total_videos": len(submissions),
            "youtube_connected": youtube_connected,
            "is_active": user.get("is_active", True)
        })
    
    return enriched_clients


async def create_client(data) -> dict:
    """Create a new client account with channel profile."""
    users_db = users_collection()
    clients_db = clients_collection()
    profiles_db = channel_profiles_collection()
    
    # Check if email already exists
    existing = await users_db.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    now = datetime.now(timezone.utc).isoformat()
    user_id = str(uuid.uuid4())
    client_id = str(uuid.uuid4())
    
    # Create user record
    user_doc = {
        "id": user_id,
        "email": data.email,
        "passwordHash": hash_password(data.password),
        "name": data.full_name,
        "full_name": data.full_name,
        "role": "client",
        "clientId": client_id,
        "is_active": True,
        "onboarding_complete": False,
        "createdAt": now,
        "updatedAt": now
    }
    await users_db.insert_one(user_doc)
    
    # Create client record
    client_doc = {
        "id": client_id,
        "name": data.full_name,
        "primaryContactName": data.full_name,
        "primaryContactEmail": data.email,
        "plan": "Free",
        "is_active": True,
        "createdAt": now,
        "updatedAt": now
    }
    await clients_db.insert_one(client_doc)
    
    # Create channel profile
    profile_doc = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "channelDescription": data.channel_description or "",
        "niche": data.niche or "",
        "contentPillars": data.content_pillars or [],
        "languageStyle": data.language_style or "English",
        "thumbnailStyle": "modern_clean",
        "tone": "",
        "brandDescription": "",
        "thumbnailsPerShort": 3,
        "createdAt": now,
        "updatedAt": now
    }
    await profiles_db.insert_one(profile_doc)
    
    return {
        "user_id": user_id,
        "email": data.email,
        "full_name": data.full_name,
        "created_at": now
    }


async def update_client(client_id: str, data) -> dict:
    """Update client details."""
    users_db = users_collection()
    clients_db = clients_collection()
    profiles_db = channel_profiles_collection()
    
    # Find the user with this clientId
    user = await users_db.find_one({"clientId": client_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Client not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Build update fields
    user_updates = {"updatedAt": now}
    client_updates = {"updatedAt": now}
    profile_updates = {"updatedAt": now}
    
    if data.full_name:
        user_updates["name"] = data.full_name
        user_updates["full_name"] = data.full_name
        client_updates["name"] = data.full_name
        client_updates["primaryContactName"] = data.full_name
    
    if data.email:
        # Check if email already exists for another user
        existing = await users_db.find_one({"email": data.email, "id": {"$ne": user["id"]}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user_updates["email"] = data.email
        client_updates["primaryContactEmail"] = data.email
    
    if data.channel_description is not None:
        profile_updates["channelDescription"] = data.channel_description
    
    if data.niche is not None:
        profile_updates["niche"] = data.niche
    
    # Apply updates
    await users_db.update_one({"clientId": client_id}, {"$set": user_updates})
    await clients_db.update_one({"id": client_id}, {"$set": client_updates})
    await profiles_db.update_one({"clientId": client_id}, {"$set": profile_updates})
    
    return {"message": "Client updated successfully", "client_id": client_id}


async def deactivate_client(client_id: str) -> dict:
    """Soft delete a client (set is_active=false)."""
    users_db = users_collection()
    clients_db = clients_collection()
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update user
    user_result = await users_db.update_one(
        {"clientId": client_id},
        {"$set": {"is_active": False, "updatedAt": now}}
    )
    
    # Update client
    client_result = await clients_db.update_one(
        {"id": client_id},
        {"$set": {"is_active": False, "updatedAt": now}}
    )
    
    if user_result.matched_count == 0 and client_result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {"message": "Client deactivated successfully", "client_id": client_id}


async def get_client_summary(client_id: str) -> dict:
    """Get a detailed summary for a specific client."""
    clients_db = clients_collection()
    users_db = users_collection()
    submissions_db = submissions_collection()
    analytics_db = analytics_snapshots_collection()
    billing_db = billing_records_collection()
    
    # Get client info - first try user, then client record
    user = await users_db.find_one({"clientId": client_id}, {"_id": 0})
    client = await clients_db.find_one({"id": client_id}, {"_id": 0})
    
    if not user and not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client_name = user.get("full_name") or user.get("name") if user else None
    if not client_name and client:
        client_name = client.get("name", "Unknown")
    
    # Get last 5 submissions
    recent_submissions = await submissions_db.find(
        {"clientId": client_id},
        {"_id": 0, "id": 1, "title": 1, "status": 1, "createdAt": 1, "contentType": 1}
    ).sort("createdAt", -1).limit(5).to_list(5)
    
    # Get last 30 days metrics
    today = datetime.now(timezone.utc).date()
    thirty_days_ago = (today - timedelta(days=30)).isoformat()
    
    analytics = await analytics_db.find(
        {"clientId": client_id, "date": {"$gte": thirty_days_ago}},
        {"_id": 0}
    ).to_list(1000)
    
    total_submissions_30d = await submissions_db.count_documents({
        "clientId": client_id,
        "createdAt": {"$gte": thirty_days_ago}
    })
    
    total_views = sum(a.get("views", 0) for a in analytics)
    total_downloads = sum(a.get("downloads", 0) for a in analytics)
    
    # Get billing info
    billing = await billing_db.find_one({"clientId": client_id}, {"_id": 0})
    
    return {
        "clientId": client_id,
        "clientName": client_name or "Unknown",
        "recentSubmissions": recent_submissions,
        "metricsLast30Days": {
            "totalSubmissions": total_submissions_30d,
            "totalViews": total_views,
            "totalDownloads": total_downloads
        },
        "billingStatus": billing.get("status") if billing else "demo/mock",
        "billingPlan": billing.get("currentPlan") if billing else "demo/mock"
    }


async def validate_impersonation(client_id: str) -> dict:
    """Validate that a client exists and return info for impersonation."""
    clients_db = clients_collection()
    users_db = users_collection()
    
    # Try to get client name from user first
    user = await users_db.find_one({"clientId": client_id}, {"_id": 0})
    client = await clients_db.find_one({"id": client_id}, {"_id": 0})
    
    if not user and not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client_name = user.get("full_name") or user.get("name") if user else None
    if not client_name and client:
        client_name = client.get("name", "Unknown")
    
    return {
        "clientId": client_id,
        "clientName": client_name or "Unknown"
    }
