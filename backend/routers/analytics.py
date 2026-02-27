"""Analytics routes."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone, timedelta
from typing import Optional

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import analytics_snapshots_collection, get_db, oauth_tokens_collection, notifications_collection

router = APIRouter(tags=["analytics"])


@router.post("/analytics/sync")
async def sync_youtube_analytics(
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Trigger a full YouTube Analytics sync for the current user.
    Fetches real analytics data from YouTube Analytics API.
    """
    from services.analytics_service import sync_channel_analytics
    
    client_id = get_client_id_from_user(user)
    
    # Get OAuth token
    oauth_db = oauth_tokens_collection()
    token = await oauth_db.find_one({"clientId": client_id, "platform": "youtube", "connected": True})
    
    if not token:
        raise HTTPException(status_code=400, detail="YouTube not connected. Please connect your account first.")
    
    access_token = token.get("accessToken")
    refresh_token = token.get("refreshToken")
    
    if not access_token or access_token.startswith("mock_"):
        raise HTTPException(status_code=400, detail="Valid YouTube OAuth token required. Please reconnect.")
    
    # Run sync
    db = get_db()
    result = await sync_channel_analytics(db, client_id, access_token, refresh_token)
    
    if result["success"]:
        # Create notification
        notif_db = notifications_collection()
        await notif_db.insert_one({
            "id": str(__import__("uuid").uuid4()),
            "userId": client_id,
            "type": "analytics_sync",
            "title": "Analytics Updated",
            "message": f"{result['synced']} videos synced from YouTube Analytics",
            "link": "/dashboard/analytics",
            "isRead": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "success": result["success"],
        "synced": result["synced"],
        "failed": result["failed"],
        "channelStats": result.get("channel_stats"),
        "errors": result.get("errors", [])
    }


@router.get("/analytics/overview")
async def get_analytics_overview(
    days: int = 30,
    user: dict = Depends(get_current_user)
):
    """
    Get aggregated analytics overview with real YouTube data.
    Returns total views, watch time, CTR, AVD, best performer, subscriber count.
    """
    from services.analytics_service import get_analytics_overview
    
    client_id = get_client_id_from_user(user)
    db = get_db()
    
    overview = await get_analytics_overview(db, client_id, days)
    return overview


@router.get("/analytics/videos")
async def get_analytics_videos(
    limit: int = 100,
    sort_by: str = "views",
    user: dict = Depends(get_current_user)
):
    """
    Get analytics data for all videos.
    Returns views, CTR, AVD, watch time per video.
    """
    client_id = get_client_id_from_user(user)
    db = get_db()
    
    sort_field = {
        "views": "views",
        "ctr": "ctr",
        "avd": "avgViewDurationSeconds",
        "watchTime": "watchTimeMinutes",
        "engagement": "engagementScore"
    }.get(sort_by, "views")
    
    # Get analytics with engagement score calculated
    analytics = await db.youtube_analytics.find(
        {"clientId": client_id},
        {"_id": 0}
    ).to_list(500)
    
    # Calculate engagement score
    for a in analytics:
        a["engagementScore"] = round(a.get("ctr", 0) * a.get("avgViewDurationSeconds", 0), 2)
    
    # Sort
    analytics.sort(key=lambda x: x.get(sort_field, 0), reverse=True)
    
    return {
        "videos": analytics[:limit],
        "totalCount": len(analytics)
    }


@router.get("/analytics/chart-data")
async def get_chart_data(
    metric: str = "views",
    period: int = 30,
    user: dict = Depends(get_current_user)
):
    """
    Get time-series chart data for a specific metric.
    Metrics: views, watchTime, ctr, avgAvd
    """
    from services.analytics_service import get_chart_data
    
    client_id = get_client_id_from_user(user)
    db = get_db()
    
    data = await get_chart_data(db, client_id, metric, period)
    
    return {
        "metric": metric,
        "period": period,
        "data": data
    }


@router.get("/analytics/top-performers")
async def get_top_performers(
    limit: int = 10,
    user: dict = Depends(get_current_user)
):
    """
    Get top performing videos by engagement score (CTR × AVD).
    """
    from services.analytics_service import get_top_performers
    
    client_id = get_client_id_from_user(user)
    db = get_db()
    
    performers = await get_top_performers(db, client_id, limit)
    
    return {
        "videos": performers,
        "count": len(performers)
    }


@router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    user: dict = Depends(get_current_user),
    range: Optional[str] = "30d",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """
    Returns analytics data for the dashboard with date range filtering.
    Now includes real YouTube analytics data if available.
    """
    client_id = get_client_id_from_user(user)
    db = get_db()
    
    today = datetime.now(timezone.utc).date()
    if from_date and to_date:
        start_date = from_date
        end_date = to_date
    else:
        range_days = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}.get(range, 30)
        start_date = (today - timedelta(days=range_days)).isoformat()
        end_date = today.isoformat()
    
    # First try to get real YouTube analytics
    youtube_analytics = await db.youtube_analytics.find(
        {"clientId": client_id},
        {"_id": 0}
    ).to_list(500)
    
    if youtube_analytics:
        # Use real YouTube data
        total_views = sum(a.get("views", 0) for a in youtube_analytics)
        total_watch_time = sum(a.get("watchTimeMinutes", 0) for a in youtube_analytics)
        avg_ctr = sum(a.get("ctr", 0) for a in youtube_analytics) / len(youtube_analytics) if youtube_analytics else 0
        avg_avd = sum(a.get("avgViewDurationSeconds", 0) for a in youtube_analytics) / len(youtube_analytics) if youtube_analytics else 0
        
        # Get channel snapshot for subscribers
        channel = await db.channel_snapshots.find_one(
            {"clientId": client_id},
            {"_id": 0},
            sort=[("syncedAt", -1)]
        )
        
        return {
            "snapshots": [],  # Legacy field
            "youtubeAnalytics": youtube_analytics,
            "summary": {
                "totalViews": total_views,
                "totalWatchTimeMinutes": round(total_watch_time, 1),
                "avgCtr": round(avg_ctr, 2),
                "avgAvd": round(avg_avd, 1),
                "videoCount": len(youtube_analytics),
                "subscriberCount": channel.get("subscriberCount", 0) if channel else 0,
                "totalDownloads": total_views,  # Legacy compatibility
                "totalEpisodes": len(youtube_analytics),
                "totalROI": round(total_watch_time * 0.003, 2),  # Rough estimate
            },
            "range": {
                "from": start_date,
                "to": end_date,
                "preset": range if not (from_date and to_date) else "custom"
            },
            "source": "youtube_analytics"
        }
    
    # Fallback to legacy analytics_snapshots
    snapshots_db = analytics_snapshots_collection()
    query = {"clientId": client_id} if client_id else {}
    query["date"] = {"$gte": start_date, "$lte": end_date}
    
    snapshots = await snapshots_db.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    
    total_downloads = sum(s.get("downloads", 0) for s in snapshots)
    total_views = sum(s.get("views", 0) for s in snapshots)
    total_episodes = sum(s.get("episodesPublished", 0) for s in snapshots)
    total_roi = sum(s.get("roiEstimate", 0) for s in snapshots)
    total_subscribers = sum(s.get("subscribersGained", 0) for s in snapshots)
    avg_roi_per_episode = round(total_roi / total_episodes, 2) if total_episodes > 0 else 0
    
    return {
        "snapshots": snapshots,
        "summary": {
            "totalDownloads": total_downloads,
            "totalViews": total_views,
            "totalEpisodes": total_episodes,
            "totalROI": round(total_roi, 2),
            "totalSubscribers": total_subscribers,
            "avgRoiPerEpisode": avg_roi_per_episode,
        },
        "range": {
            "from": start_date,
            "to": end_date,
            "preset": range if not (from_date and to_date) else "custom"
        },
        "source": "legacy_snapshots"
    }
