"""
Trends API routes - Sprint 9B
Competitor scanning, trend analysis, and AI recommendations.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timezone
from typing import Optional

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import get_db, oauth_tokens_collection

router = APIRouter(prefix="/trends", tags=["trends"])

# Track scan status in memory (would use Redis in production)
_scan_status = {}


@router.post("/scan")
async def trigger_trend_scan(
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """
    Trigger a full competitor + keyword trend scan.
    Runs in background and generates recommendations after completion.
    """
    client_id = get_client_id_from_user(user)
    
    # Get OAuth token for API calls
    oauth_db = oauth_tokens_collection()
    token = await oauth_db.find_one({"clientId": client_id, "platform": "youtube", "connected": True})
    
    access_token = token.get("accessToken") if token else None
    refresh_token = token.get("refreshToken") if token else None
    
    # Start background scan
    _scan_status[client_id] = {
        "status": "scanning",
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "progress": "Starting competitor scan..."
    }
    
    background_tasks.add_task(
        run_full_scan,
        client_id,
        access_token,
        refresh_token
    )
    
    return {
        "status": "scanning",
        "message": "Scan started. Check /api/trends/scan/status for progress."
    }


async def run_full_scan(client_id: str, access_token: str, refresh_token: str):
    """Background task to run full trend scan and generate recommendations."""
    from services.trend_service import scan_competitors, scan_trending_topics, generate_recommendations
    from db.mongo import get_db, notifications_collection
    
    db = get_db()
    
    try:
        # Step 1: Scan competitors
        _scan_status[client_id]["progress"] = "Scanning 11 competitor channels..."
        competitor_result = await scan_competitors(db, client_id, access_token, refresh_token)
        
        # Step 2: Scan trending topics
        _scan_status[client_id]["progress"] = "Analyzing trending topics..."
        trend_result = await scan_trending_topics(db, client_id, access_token, refresh_token)
        
        # Step 3: Generate recommendations
        _scan_status[client_id]["progress"] = "Generating AI recommendations..."
        rec_result = await generate_recommendations(db, client_id)
        
        # Update status
        _scan_status[client_id] = {
            "status": "complete",
            "completedAt": datetime.now(timezone.utc).isoformat(),
            "results": {
                "channelsScanned": competitor_result.get("channelsScanned", 0),
                "competitorVideos": competitor_result.get("videosFound", 0),
                "trendingVideos": trend_result.get("videosFound", 0),
                "recommendationsGenerated": len(rec_result.get("recommendations", []))
            }
        }
        
        # Create notification
        notif_db = notifications_collection()
        await notif_db.insert_one({
            "id": str(__import__("uuid").uuid4()),
            "userId": client_id,
            "type": "fvs_scan_complete",
            "title": "Trend Scan Complete",
            "message": f"3 new content ideas ready based on {competitor_result.get('videosFound', 0)} competitor videos analyzed",
            "link": "/dashboard/fvs-system",
            "isRead": False,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        _scan_status[client_id] = {
            "status": "error",
            "error": str(e),
            "completedAt": datetime.now(timezone.utc).isoformat()
        }


@router.get("/scan/status")
async def get_scan_status(user: dict = Depends(get_current_user)):
    """Get current scan status for the user."""
    client_id = get_client_id_from_user(user)
    status = _scan_status.get(client_id, {"status": "idle"})
    return status


@router.get("/recommendations")
async def get_recommendations(user: dict = Depends(get_current_user)):
    """Get latest AI-generated content recommendations."""
    from services.trend_service import get_latest_recommendations
    
    client_id = get_client_id_from_user(user)
    db = get_db()
    
    rec = await get_latest_recommendations(db, client_id)
    
    if not rec:
        return {
            "recommendations": [],
            "generatedAt": None,
            "message": "No recommendations yet. Run a trend scan first."
        }
    
    return rec


@router.get("/competitors")
async def get_competitor_data(
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """Get latest competitor video data."""
    from services.trend_service import get_competitor_videos
    
    client_id = get_client_id_from_user(user)
    db = get_db()
    
    videos = await get_competitor_videos(db, client_id, limit)
    
    return {
        "videos": videos,
        "count": len(videos)
    }


@router.get("/trending")
async def get_trending_data(user: dict = Depends(get_current_user)):
    """Get trending topics grouped by keyword."""
    from services.trend_service import get_trending_topics
    
    client_id = get_client_id_from_user(user)
    db = get_db()
    
    topics = await get_trending_topics(db, client_id)
    
    # Group by keyword
    grouped = {}
    for t in topics:
        keyword = t.get("keyword", "Other")
        if keyword not in grouped:
            grouped[keyword] = []
        grouped[keyword].append(t)
    
    return {
        "topics": grouped,
        "totalCount": len(topics)
    }
