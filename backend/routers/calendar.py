"""Calendar routes."""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone
from typing import Optional

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import submissions_collection

router = APIRouter(tags=["calendar"])


@router.get("/calendar")
async def get_calendar(
    user: dict = Depends(get_current_user), 
    year: Optional[int] = None, 
    month: Optional[int] = None,
    impersonateClientId: Optional[str] = Query(None)
):
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    query = {"clientId": client_id} if client_id else {}
    
    now = datetime.now(timezone.utc)
    target_year = year or now.year
    target_month = month or now.month
    
    first_day = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        last_day = f"{target_year + 1}-01-01"
    else:
        last_day = f"{target_year}-{target_month + 1:02d}-01"
    
    query["releaseDate"] = {"$gte": first_day, "$lt": last_day}
    
    submissions = await db.find(query, {"_id": 0}).to_list(1000)
    return {
        "year": target_year,
        "month": target_month,
        "submissions": submissions
    }
