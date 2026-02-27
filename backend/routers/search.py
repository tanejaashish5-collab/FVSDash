"""
Global Search API for ForgeVoice Studio.

Searches across submissions, assets, and FVS recommendations.
Returns grouped results with type badges.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
import re

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import (
    submissions_collection, assets_collection, fvs_recommendations_collection
)

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def global_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Max results per category"),
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Global search across submissions, assets, and recommendations.
    
    Returns grouped results:
    - submissions: Matching submissions (title, description)
    - assets: Matching assets (name)
    - recommendations: Matching FVS recommendations (title, hook)
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    # Build case-insensitive regex pattern
    pattern = {"$regex": re.escape(q), "$options": "i"}
    
    # Search submissions
    subs_db = submissions_collection()
    submissions = await subs_db.find(
        {
            "clientId": client_id,
            "$or": [
                {"title": pattern},
                {"description": pattern},
                {"hook": pattern}
            ]
        },
        {
            "_id": 0,
            "id": 1,
            "title": 1,
            "description": 1,
            "contentType": 1,
            "status": 1,
            "createdAt": 1
        }
    ).sort("createdAt", -1).limit(limit).to_list(limit)
    
    # Add type badge to each submission
    for sub in submissions:
        sub["type"] = "submission"
        sub["subtitle"] = f"{sub.get('contentType', 'Content')} • {sub.get('status', 'Unknown')}"
        sub["url"] = f"/dashboard/submissions?highlight={sub['id']}"
    
    # Search assets
    assets_db = assets_collection()
    assets = await assets_db.find(
        {
            "clientId": client_id,
            "$or": [
                {"name": pattern},
                {"assetType": pattern}
            ]
        },
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "assetType": 1,
            "status": 1,
            "createdAt": 1
        }
    ).sort("createdAt", -1).limit(limit).to_list(limit)
    
    # Add type badge to each asset
    for asset in assets:
        asset["type"] = "asset"
        asset["title"] = asset.get("name", "Untitled Asset")
        asset["subtitle"] = f"{asset.get('assetType', 'File')} • {asset.get('status', 'Draft')}"
        asset["url"] = f"/dashboard/assets?highlight={asset['id']}"
    
    # Search recommendations
    recs_db = fvs_recommendations_collection()
    recommendations = await recs_db.find(
        {
            "clientId": client_id,
            "$or": [
                {"title": pattern},
                {"hook": pattern},
                {"topic": pattern}
            ]
        },
        {
            "_id": 0,
            "id": 1,
            "title": 1,
            "hook": 1,
            "tier": 1,
            "status": 1,
            "createdAt": 1
        }
    ).sort("createdAt", -1).limit(limit).to_list(limit)
    
    # Add type badge to each recommendation
    for rec in recommendations:
        rec["type"] = "recommendation"
        rec["subtitle"] = f"{rec.get('tier', 'Medium')} Priority Idea"
        rec["url"] = f"/dashboard/fvs?highlight={rec['id']}"
    
    # Calculate total
    total = len(submissions) + len(assets) + len(recommendations)
    
    return {
        "query": q,
        "submissions": submissions,
        "assets": assets,
        "recommendations": recommendations,
        "total": total,
        "counts": {
            "submissions": len(submissions),
            "assets": len(assets),
            "recommendations": len(recommendations)
        }
    }
