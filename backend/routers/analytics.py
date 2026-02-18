"""Analytics routes."""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import analytics_snapshots_collection

router = APIRouter(tags=["analytics"])


@router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    user: dict = Depends(get_current_user),
    range: Optional[str] = "30d",
    from_date: Optional[str] = None,
    to_date: Optional[str] = None
):
    """
    Returns analytics data for the dashboard with date range filtering.
    range: 7d, 30d, 90d, 365d
    from_date, to_date: ISO date strings for custom range (override range param)
    """
    client_id = get_client_id_from_user(user)
    db = analytics_snapshots_collection()
    query = {"clientId": client_id} if client_id else {}
    
    today = datetime.now(timezone.utc).date()
    if from_date and to_date:
        start_date = from_date
        end_date = to_date
    else:
        range_days = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}.get(range, 30)
        start_date = (today - timedelta(days=range_days)).isoformat()
        end_date = today.isoformat()
    
    query["date"] = {"$gte": start_date, "$lte": end_date}
    
    snapshots = await db.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    
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
        }
    }
