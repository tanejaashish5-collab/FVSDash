"""Admin service - client management and impersonation logic."""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import HTTPException

from db.mongo import (
    clients_collection, submissions_collection, assets_collection,
    analytics_snapshots_collection, billing_records_collection
)


async def get_all_clients_with_metrics() -> List[dict]:
    """Get all clients with their key metrics (submission count, last activity)."""
    clients_db = clients_collection()
    submissions_db = submissions_collection()
    
    clients = await clients_db.find({}, {"_id": 0}).to_list(1000)
    
    enriched_clients = []
    for client in clients:
        client_id = client.get("id")
        
        # Get submission count
        submissions = await submissions_db.find(
            {"clientId": client_id}, 
            {"_id": 0, "updatedAt": 1, "createdAt": 1}
        ).to_list(1000)
        
        # Find last activity date
        last_activity = None
        if submissions:
            dates = [s.get("updatedAt") or s.get("createdAt") for s in submissions if s.get("updatedAt") or s.get("createdAt")]
            if dates:
                last_activity = max(dates)
        
        enriched_clients.append({
            "id": client_id,
            "name": client.get("name", "Unknown"),
            "primaryContactName": client.get("primaryContactName"),
            "primaryContactEmail": client.get("primaryContactEmail"),
            "plan": client.get("plan", "Free"),
            "status": client.get("status", "Active"),
            "submissionsCount": len(submissions),
            "lastActivityDate": last_activity
        })
    
    return enriched_clients


async def get_client_summary(client_id: str) -> dict:
    """Get a detailed summary for a specific client."""
    clients_db = clients_collection()
    submissions_db = submissions_collection()
    analytics_db = analytics_snapshots_collection()
    billing_db = billing_records_collection()
    
    # Get client info
    client = await clients_db.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
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
        "clientName": client.get("name", "Unknown"),
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
    
    client = await clients_db.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {
        "clientId": client_id,
        "clientName": client.get("name", "Unknown")
    }
