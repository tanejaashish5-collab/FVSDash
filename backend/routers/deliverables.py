"""Deliverables routes."""
from fastapi import APIRouter, Depends, Query
from typing import Optional

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import assets_collection, submissions_collection

router = APIRouter(tags=["deliverables"])


@router.get("/deliverables")
async def get_deliverables(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    assets_db = assets_collection()
    submissions_db = submissions_collection()
    query = {"clientId": client_id} if client_id else {}
    
    assets = await assets_db.find(query, {"_id": 0}).to_list(1000)
    
    submission_ids = list(set(a.get("submissionId") for a in assets if a.get("submissionId")))
    
    submissions_map = {}
    if submission_ids:
        submissions = await submissions_db.find(
            {"id": {"$in": submission_ids}}, 
            {"_id": 0, "id": 1, "title": 1, "contentType": 1, "releaseDate": 1}
        ).to_list(1000)
        submissions_map = {s["id"]: s for s in submissions}
    
    deliverables = []
    for asset in assets:
        sub = submissions_map.get(asset.get("submissionId"), {})
        deliverables.append({
            "assetId": asset["id"],
            "deliverableName": asset["name"],
            "deliverableType": asset["type"],
            "deliverableStatus": asset["status"],
            "url": asset.get("url"),
            "submissionId": asset.get("submissionId"),
            "episodeTitle": sub.get("title", "Unlinked"),
            "contentType": sub.get("contentType", "—"),
            "releaseDate": sub.get("releaseDate"),
            "createdAt": asset.get("createdAt"),
        })
    
    return deliverables
