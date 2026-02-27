"""ROI Center routes."""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import analytics_snapshots_collection, client_settings_collection

router = APIRouter(tags=["roi"])


@router.get("/roi/dashboard")
async def get_roi_dashboard(
    user: dict = Depends(get_current_user),
    range: Optional[str] = "30d"
):
    """
    Returns ROI calculations based on AnalyticsSnapshot + ClientSettings.
    Uses hourlyRate and hoursPerEpisode from ClientSettings.
    """
    client_id = get_client_id_from_user(user)
    
    settings_db = client_settings_collection()
    analytics_db = analytics_snapshots_collection()
    
    settings = await settings_db.find_one({"clientId": client_id}, {"_id": 0}) if client_id else None
    hourly_rate = settings.get("hourlyRate", 100) if settings else 100
    hours_per_episode = settings.get("hoursPerEpisode", 5) if settings else 5
    
    today = datetime.now(timezone.utc).date()
    range_days = {"7d": 7, "30d": 30, "90d": 90, "365d": 365}.get(range, 30)
    start_date = (today - timedelta(days=range_days)).isoformat()
    end_date = today.isoformat()
    
    query = {"clientId": client_id} if client_id else {}
    query["date"] = {"$gte": start_date, "$lte": end_date}
    
    snapshots = await analytics_db.find(query, {"_id": 0}).to_list(1000)
    
    total_episodes = sum(s.get("episodesPublished", 0) for s in snapshots)
    total_roi = sum(s.get("roiEstimate", 0) for s in snapshots)
    total_downloads = sum(s.get("downloads", 0) for s in snapshots)
    total_views = sum(s.get("views", 0) for s in snapshots)
    
    cost_per_episode = hours_per_episode * hourly_rate
    total_cost = cost_per_episode * total_episodes
    roi_multiple = round(total_roi / total_cost, 2) if total_cost > 0 else 0
    net_profit = total_roi - total_cost
    
    return {
        "totalCost": round(total_cost, 2),
        "totalROI": round(total_roi, 2),
        "roiMultiple": roi_multiple,
        "netProfit": round(net_profit, 2),
        "episodesPublished": total_episodes,
        "hoursPerEpisode": hours_per_episode,
        "hourlyRate": hourly_rate,
        "costPerEpisode": cost_per_episode,
        "totalDownloads": total_downloads,
        "totalViews": total_views,
        "range": {
            "from": start_date,
            "to": end_date,
            "preset": range,
            "days": range_days
        }
    }
