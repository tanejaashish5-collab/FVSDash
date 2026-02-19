"""Calendar routes."""
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional, List

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


@router.get("/calendar/pipeline")
async def get_calendar_pipeline(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Get all unscheduled submissions for the content pipeline sidebar."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    
    query = {"clientId": client_id} if client_id else {}
    # Get submissions that are INTAKE or EDITING and have no release date
    query["status"] = {"$in": ["INTAKE", "EDITING"]}
    query["$or"] = [
        {"releaseDate": {"$exists": False}},
        {"releaseDate": None},
        {"releaseDate": ""}
    ]
    
    submissions = await db.find(query, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return {"submissions": submissions}


@router.get("/calendar/suggest")
async def get_calendar_suggestions(
    user: dict = Depends(get_current_user),
    year: Optional[int] = None,
    month: Optional[int] = None,
    impersonateClientId: Optional[str] = Query(None)
):
    """AI-powered gap analysis for content scheduling suggestions."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    
    now = datetime.now(timezone.utc)
    target_year = year or now.year
    target_month = month or now.month
    
    # Get scheduled submissions for this month
    first_day = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        last_day = f"{target_year + 1}-01-01"
    else:
        last_day = f"{target_year}-{target_month + 1:02d}-01"
    
    scheduled_query = {"clientId": client_id} if client_id else {}
    scheduled_query["releaseDate"] = {"$gte": first_day, "$lt": last_day}
    scheduled = await db.find(scheduled_query, {"_id": 0}).to_list(1000)
    
    # Get unscheduled content from pipeline
    pipeline_query = {"clientId": client_id} if client_id else {}
    pipeline_query["status"] = {"$in": ["INTAKE", "EDITING"]}
    pipeline_query["$or"] = [
        {"releaseDate": {"$exists": False}},
        {"releaseDate": None},
        {"releaseDate": ""}
    ]
    pipeline = await db.find(pipeline_query, {"_id": 0}).to_list(100)
    
    # Build set of scheduled dates
    scheduled_dates = set(sub.get("releaseDate") for sub in scheduled if sub.get("releaseDate"))
    
    # Find gaps (days without content > 48 hours apart)
    suggestions = []
    
    # Generate all days in the month
    from calendar import monthrange
    _, num_days = monthrange(target_year, target_month)
    
    today = now.date()
    
    for day in range(1, num_days + 1):
        date_str = f"{target_year}-{target_month:02d}-{day:02d}"
        check_date = datetime(target_year, target_month, day).date()
        
        # Skip past dates
        if check_date < today:
            continue
            
        # Check if this date has content
        if date_str in scheduled_dates:
            continue
        
        # Check surrounding days for content gaps (>48 hours)
        prev_date = f"{target_year}-{target_month:02d}-{max(1, day-1):02d}"
        prev_2_date = f"{target_year}-{target_month:02d}-{max(1, day-2):02d}"
        
        # Identify gap if neither yesterday nor day before has content
        is_gap = prev_date not in scheduled_dates and prev_2_date not in scheduled_dates
        
        if is_gap and pipeline:
            # Determine recommended content type based on day of week
            weekday = check_date.weekday()  # 0=Mon, 6=Sun
            
            if weekday in [0, 2]:  # Mon, Wed - Shorts Day
                recommended_type = "Short"
            elif weekday in [1, 3]:  # Tue, Thu - Podcast Day
                recommended_type = "Podcast"
            elif weekday == 4:  # Fri - Blog Day
                recommended_type = "Blog"
            else:
                recommended_type = "Short"  # Default to short for weekends
            
            # Find best matching content from pipeline
            matching_content = next(
                (p for p in pipeline if p.get("contentType") == recommended_type),
                pipeline[0] if pipeline else None
            )
            
            if matching_content:
                suggestions.append({
                    "date": date_str,
                    "recommendedType": recommended_type,
                    "suggestedSubmission": matching_content,
                    "reason": f"Content gap detected - {recommended_type} recommended for this day"
                })
    
    return {
        "suggestions": suggestions[:5],  # Limit to 5 suggestions
        "totalGaps": len(suggestions),
        "pipelineCount": len(pipeline)
    }


@router.patch("/calendar/schedule/{submission_id}")
async def schedule_submission(
    submission_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None),
    date: str = Query(..., description="Date in YYYY-MM-DD format")
):
    """Schedule or reschedule a submission to a specific date."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    
    query = {"id": submission_id}
    if client_id:
        query["clientId"] = client_id
    
    # Update the submission with new release date and set status to SCHEDULED
    update = {
        "$set": {
            "releaseDate": date,
            "status": "SCHEDULED",
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
    }
    
    result = await db.update_one(query, update)
    if result.modified_count == 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"success": True, "message": f"Scheduled to {date}"}


@router.patch("/calendar/unschedule/{submission_id}")
async def unschedule_submission(
    submission_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Remove scheduling from a submission (move back to pipeline)."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = submissions_collection()
    
    query = {"id": submission_id}
    if client_id:
        query["clientId"] = client_id
    
    # Clear release date and set status back to EDITING
    update = {
        "$set": {
            "releaseDate": None,
            "status": "EDITING",
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
    }
    
    result = await db.update_one(query, update)
    if result.modified_count == 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"success": True, "message": "Submission unscheduled"}
