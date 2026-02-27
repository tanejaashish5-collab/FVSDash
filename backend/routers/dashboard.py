"""Dashboard overview and stats routes."""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import (
    submissions_collection, assets_collection,
    analytics_snapshots_collection, clients_collection, video_tasks_collection,
    users_collection, channel_snapshots_collection
)

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    query = {"clientId": client_id} if client_id else {}

    submissions_db = submissions_collection()
    assets_db = assets_collection()
    analytics_db = analytics_snapshots_collection()

    submissions = await submissions_db.find(query, {"_id": 0}).to_list(1000)
    assets = await assets_db.find(query, {"_id": 0}).to_list(1000)
    analytics = await analytics_db.find(query, {"_id": 0}).sort("date", -1).to_list(30)

    total_views = sum(a.get("views", 0) for a in analytics)
    total_downloads = sum(a.get("downloads", 0) for a in analytics)
    total_subscribers = sum(a.get("subscribersGained", 0) for a in analytics)

    return {
        "totalSubmissions": len(submissions),
        "totalAssets": len(assets),
        "totalViews": total_views,
        "totalDownloads": total_downloads,
        "subscribersGained": total_subscribers,
        "recentSubmissions": submissions[:5],
        "analyticsData": list(reversed(analytics[:14]))
    }


@router.get("/dashboard/overview")
async def get_dashboard_overview(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    query = {"clientId": client_id} if client_id else {}

    clients_db = clients_collection()
    submissions_db = submissions_collection()
    assets_db = assets_collection()
    analytics_db = analytics_snapshots_collection()
    video_tasks_db = video_tasks_collection()

    client_info = None
    if client_id:
        client_info = await clients_db.find_one({"id": client_id}, {"_id": 0})

    submissions = await submissions_db.find(query, {"_id": 0}).to_list(1000)
    assets = await assets_db.find(query, {"_id": 0}).to_list(1000)

    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    analytics_query = {**query, "date": {"$gte": thirty_days_ago}}
    analytics = await analytics_db.find(analytics_query, {"_id": 0}).to_list(1000)

    active_projects = len([s for s in submissions if s["status"] != "PUBLISHED"])
    published_30d = len([s for s in submissions if s["status"] == "PUBLISHED" and s.get("releaseDate") and s["releaseDate"] >= thirty_days_ago])
    total_assets = len(assets)
    roi_30d = sum(a.get("roiEstimate", 0) for a in analytics)

    pipeline = {}
    for st in ["INTAKE", "EDITING", "DESIGN", "SCHEDULED", "PUBLISHED"]:
        pipeline[st] = [s for s in submissions if s["status"] == st]

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming = sorted(
        [s for s in submissions if s["status"] in ("SCHEDULED", "PUBLISHED") and s.get("releaseDate") and s["releaseDate"] >= today_str],
        key=lambda x: x["releaseDate"]
    )[:5]

    video_tasks = await video_tasks_db.find(query, {"_id": 0}).to_list(100)

    activities = []
    status_verbs = {
        "INTAKE": "submitted for intake",
        "EDITING": "moved to editing",
        "DESIGN": "entered design phase",
        "SCHEDULED": "scheduled for release",
        "PUBLISHED": "published",
    }
    for s in sorted(submissions, key=lambda x: x.get("updatedAt", ""), reverse=True)[:6]:
        activities.append({
            "type": "submission",
            "message": f"'{s['title']}' {status_verbs.get(s['status'], 'updated')}",
            "timestamp": s.get("updatedAt", s.get("createdAt", "")),
            "status": s["status"],
        })
    for vt in sorted(video_tasks, key=lambda x: x.get("createdAt", ""), reverse=True)[:3]:
        activities.append({
            "type": "video_task",
            "message": f"AI Video: '{vt['prompt'][:40]}' — {vt['status']}",
            "timestamp": vt.get("createdAt", ""),
            "status": vt["status"],
        })
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    recent = sorted(submissions, key=lambda x: x.get("createdAt", ""), reverse=True)[:10]

    return {
        "clientName": client_info["name"] if client_info else user.get("name", "User"),
        "userName": user.get("name", "User"),
        "kpis": {
            "activeProjects": active_projects,
            "publishedLast30d": published_30d,
            "totalAssets": total_assets,
            "roiLast30d": round(roi_30d, 2),
        },
        "pipeline": pipeline,
        "upcoming": upcoming,
        "activities": activities[:10],
        "recentSubmissions": recent,
    }


@router.get("/dashboard/admin-overview")
async def get_admin_overview(user: dict = Depends(get_current_user)):
    """
    Admin-specific overview with cross-channel summary.
    Returns: Total Clients, Total Videos Managed, Total Views Managed, Active Channels
    """
    if user.get("role") != "admin":
        return {"error": "Not authorized"}
    
    users_db = users_collection()
    submissions_db = submissions_collection()
    channel_db = channel_snapshots_collection()
    
    # Count only active clients (is_active: true AND role: "client")
    total_clients = await users_db.count_documents({
        "role": "client",
        "is_active": {"$ne": False}  # Include if is_active is True or not set
    })
    
    # Get list of active client IDs
    active_clients = await users_db.find(
        {"role": "client", "is_active": {"$ne": False}},
        {"_id": 0, "id": 1}
    ).to_list(1000)
    active_client_ids = [c.get("id") for c in active_clients if c.get("id")]
    
    # Count total submissions across active clients only
    total_videos = await submissions_db.count_documents({
        "clientId": {"$in": active_client_ids}
    }) if active_client_ids else 0
    
    # Sum views from channel snapshots for active clients
    total_views = 0
    for client_id in active_client_ids:
        # Get latest channel snapshot for this client
        snapshot = await channel_db.find_one(
            {"user_id": client_id},
            {"_id": 0, "total_views": 1, "totalViews": 1, "subscriberCount": 1},
            sort=[("snapshot_date", -1)]
        )
        if snapshot:
            views = snapshot.get("total_views") or snapshot.get("totalViews") or 0
            total_views += views
    
    # Count active channels - clients with valid (non-expired) OAuth token
    from db.mongo import get_db
    db = get_db()
    oauth_db = db.oauth_tokens
    
    active_channels = 0
    for client_id in active_client_ids:
        # Check if client has a valid YouTube OAuth token
        token = await oauth_db.find_one({
            "user_id": client_id,
            "provider": "youtube"
        }, {"_id": 0, "expires_at": 1, "access_token": 1})
        if token and token.get("access_token"):
            active_channels += 1
    
    return {
        "totalClients": total_clients,
        "totalVideosManaged": total_videos,
        "totalViewsManaged": total_views,
        "activeChannels": active_channels
    }

