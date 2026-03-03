"""
Content Calendar AI Service - Sprint 13
Optimal posting time intelligence based on historical performance data.
"""
import uuid
import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

import pytz

logger = logging.getLogger(__name__)

# IST timezone
IST = pytz.timezone('Asia/Kolkata')

# Time slot definitions (IST)
TIME_SLOTS = {
    "morning": {"start": 6, "end": 12, "label": "Morning (6 AM - 12 PM)"},
    "afternoon": {"start": 12, "end": 18, "label": "Afternoon (12 PM - 6 PM)"},
    "evening": {"start": 18, "end": 22, "label": "Evening (6 PM - 10 PM)"},
    "night": {"start": 22, "end": 6, "label": "Night (10 PM - 6 AM)"}
}

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def get_time_slot(hour: int) -> str:
    """Determine time slot from hour (IST)."""
    if 6 <= hour < 12:
        return "morning"
    elif 12 <= hour < 18:
        return "afternoon"
    elif 18 <= hour < 22:
        return "evening"
    else:
        return "night"


async def analyse_posting_patterns(db, user_id: str) -> Dict[str, Any]:
    """
    Analyze posting patterns to determine optimal posting times.
    Groups published submissions by day of week and time slot.
    """
    # Get all published submissions with release dates
    submissions = await db.submissions.find({
        "clientId": user_id,
        "status": "PUBLISHED",
        "releaseDate": {"$ne": None}
    }, {"_id": 0, "id": 1, "title": 1, "releaseDate": 1, "youtube_video_id": 1}).to_list(500)
    
    # Initialize performance matrix (7 days x 4 time slots)
    matrix = {}
    for day in range(7):
        matrix[day] = {
            "morning": {"views": [], "count": 0},
            "afternoon": {"views": [], "count": 0},
            "evening": {"views": [], "count": 0},
            "night": {"views": [], "count": 0}
        }
    
    total_analyzed = 0
    
    for sub in submissions:
        release_date = sub.get("releaseDate")
        if not release_date:
            continue
        
        try:
            # Parse release date
            if isinstance(release_date, str):
                dt = datetime.fromisoformat(release_date.replace("Z", "+00:00"))
            else:
                dt = release_date
            
            # Convert to IST
            dt_ist = dt.astimezone(IST)
            day_of_week = dt_ist.weekday()  # Monday = 0
            hour = dt_ist.hour
            time_slot = get_time_slot(hour)
            
            # Get analytics data for this video
            video_id = sub.get("youtube_video_id")
            views = 0
            
            if video_id:
                analytics = await db.youtube_analytics.find_one(
                    {"videoId": video_id},
                    {"_id": 0, "views": 1}
                )
                if analytics:
                    views = analytics.get("views", 0)
            
            matrix[day_of_week][time_slot]["views"].append(views)
            matrix[day_of_week][time_slot]["count"] += 1
            total_analyzed += 1
            
        except Exception as e:
            logger.warning(f"Error parsing date for submission: {e}")
            continue
    
    # Calculate averages
    result = {}
    for day in range(7):
        result[day] = {}
        for slot in ["morning", "afternoon", "evening", "night"]:
            views_list = matrix[day][slot]["views"]
            count = matrix[day][slot]["count"]
            avg = sum(views_list) / len(views_list) if views_list else 0
            result[day][slot] = {
                "avg_views": round(avg),
                "sample_size": count,
                "confidence": "High" if count >= 5 else "Medium" if count >= 2 else "Low"
            }
    
    return {
        "matrix": result,
        "total_analyzed": total_analyzed
    }


async def get_best_posting_times(db, user_id: str) -> List[Dict[str, Any]]:
    """
    Get top 3 performing day/time slot combinations.
    """
    analysis = await analyse_posting_patterns(db, user_id)
    matrix = analysis["matrix"]
    
    # Flatten and sort by average views
    all_slots = []
    for day in range(7):
        for slot in ["morning", "afternoon", "evening", "night"]:
            data = matrix[day][slot]
            if data["sample_size"] > 0:
                all_slots.append({
                    "day": DAY_NAMES[day],
                    "day_index": day,
                    "time_slot": slot,
                    "time_label": TIME_SLOTS[slot]["label"],
                    "avg_views": data["avg_views"],
                    "sample_size": data["sample_size"],
                    "confidence": data["confidence"]
                })
    
    # Sort by avg_views descending
    all_slots.sort(key=lambda x: x["avg_views"], reverse=True)
    top_slots = all_slots[:3]

    # If no data from submissions, fall back to youtube_analytics directly
    if not top_slots:
        youtube_analytics = await db.youtube_analytics.find(
            {"clientId": user_id}, {"_id": 0}
        ).to_list(200)
        if youtube_analytics:
            from collections import defaultdict
            slot_views = defaultdict(lambda: {"views": 0, "count": 0})
            for record in youtube_analytics:
                published = record.get("publishedAt", "")
                if published:
                    try:
                        dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                        day = dt.strftime("%A")
                        hour = dt.hour
                        time_label = f"{hour}:00 - {hour+2}:00"
                        key = f"{day}_{time_label}"
                        slot_views[key]["views"] += record.get("views", 0)
                        slot_views[key]["count"] += 1
                        slot_views[key]["day"] = day
                        slot_views[key]["time_label"] = time_label
                    except Exception:
                        pass
            if slot_views:
                sorted_slots = sorted(slot_views.values(), key=lambda x: x["views"], reverse=True)
                top_slots = [{"day": s["day"], "time_label": s["time_label"],
                              "avg_views": s["views"] // max(s["count"], 1),
                              "confidence": "Medium"} for s in sorted_slots[:5]]

    if not top_slots:
        top_slots = [
            {"day": "Tuesday", "time_label": "7:00 PM - 9:00 PM IST", "avg_views": 0, "confidence": "Low (no data)"},
            {"day": "Thursday", "time_label": "7:00 PM - 9:00 PM IST", "avg_views": 0, "confidence": "Low (no data)"},
            {"day": "Saturday", "time_label": "9:00 AM - 11:00 AM IST", "avg_views": 0, "confidence": "Low (no data)"},
        ]

    return {
        "top_slots": top_slots,
        "total_analyzed": analysis["total_analyzed"]
    }


async def generate_posting_schedule(
    db,
    user_id: str,
    weeks_ahead: int = 4,
    llm_service = None
) -> Dict[str, Any]:
    """
    Generate an AI-powered 4-week posting schedule.
    Uses Gemini 2.0 Flash to create optimized schedule.
    """
    from services.ai_service import call_gemini
    
    # Get best posting times
    best_times = await get_best_posting_times(db, user_id)
    top_slots = best_times["top_slots"]
    
    # Get unscheduled submissions (pipeline content)
    pipeline_subs = await db.submissions.find({
        "clientId": user_id,
        "status": {"$in": ["INTAKE", "EDITING"]},
        "$or": [
            {"releaseDate": None},
            {"releaseDate": ""}
        ]
    }, {"_id": 0, "id": 1, "title": 1, "contentType": 1, "status": 1}).to_list(20)
    
    # Get latest FVS recommendations
    rec_doc = await db.fvs_recommendations.find_one(
        {"clientId": user_id},
        {"_id": 0},
        sort=[("generatedAt", -1)]
    )
    recommendations = rec_doc.get("recommendations", [])[:5] if rec_doc else []
    
    # Format data for the prompt
    top_slots_text = "\n".join([
        f"- {s['day']} {s['time_label']}: avg {s['avg_views']:,} views ({s['confidence']} confidence)"
        for s in top_slots
    ]) if top_slots else "No historical data available yet."
    
    pipeline_text = "\n".join([
        f"- [{sub['id'][:8]}] {sub['title']} ({sub['contentType']})"
        for sub in pipeline_subs
    ]) if pipeline_subs else "No unscheduled content in pipeline."
    
    rec_text = "\n".join([
        f"- {rec.get('title', rec.get('topic', 'Untitled'))}"
        for rec in recommendations
    ]) if recommendations else "No AI recommendations available."
    
    start_date = datetime.now(IST) + timedelta(days=1)
    
    prompt = f"""You are a YouTube Shorts scheduling strategist for Chanakya Sutra — a channel posting Hinglish strategic wisdom content to an Indian urban male audience (25-44).

Performance data shows these are the best posting times (IST):
{top_slots_text}

Available content to schedule (from production pipeline):
{pipeline_text}

Recommended content ideas (AI-generated, not yet created):
{rec_text}

Generate a {weeks_ahead}-week posting schedule starting from {start_date.strftime('%Y-%m-%d')}.
Rules:
- Post 5-7 times per week (daily is ideal for Shorts)
- Prioritize existing pipeline submissions first
- Fill gaps with recommended ideas (mark as "idea" not "scheduled")
- Align high-potential content with highest-performing time slots
- Include optimal IST posting time for each slot

Return ONLY a valid JSON array with this structure (no markdown, no explanation):
[
  {{
    "date": "YYYY-MM-DD",
    "day_of_week": "Monday",
    "time_ist": "7:00 PM",
    "content_title": "Title here",
    "content_type": "scheduled" or "idea",
    "submission_id": "uuid if scheduled, null if idea",
    "recommendation_id": "string if idea, null if scheduled",
    "confidence_score": 0.85
  }}
]
"""

    schedule = None
    try:
        response = await call_gemini(prompt, max_tokens=4000)

        # Parse the response — handle markdown wrapping robustly
        response_text = response.strip()
        # Strip markdown code fences (```json ... ``` or ``` ... ```)
        if "```" in response_text:
            parts = response_text.split("```")
            # Pick the first block that looks like JSON
            for part in parts:
                cleaned = part.strip()
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:].strip()
                if cleaned.startswith("[") or cleaned.startswith("{"):
                    response_text = cleaned
                    break
        response_text = response_text.strip()

        schedule = json.loads(response_text)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI schedule response: {e}")
    except Exception as e:
        logger.error(f"AI schedule generation failed: {e}")

    # Fallback: generate rule-based schedule if AI failed
    if not schedule or not isinstance(schedule, list) or len(schedule) == 0:
        logger.info("AI schedule empty or failed — generating rule-based fallback")
        schedule = []
        default_times = ["7:00 PM", "12:30 PM", "9:00 AM"]
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        for week in range(weeks_ahead):
            for day_offset in range(7):
                target = start_date + timedelta(days=week * 7 + day_offset)
                if day_offset >= 5 and not pipeline_subs and not recommendations:
                    continue  # skip weekends if no content
                source = None
                title = "Content idea"
                ctype = "idea"
                sub_id = None
                rec_id = None
                if pipeline_subs:
                    source = pipeline_subs.pop(0)
                    title = source.get("title", "Untitled")
                    ctype = "scheduled"
                    sub_id = source.get("id")
                elif recommendations:
                    source = recommendations.pop(0)
                    title = source.get("title", source.get("topic", "AI Idea"))
                    ctype = "idea"
                    rec_id = source.get("id")
                else:
                    title = f"Short #{week * 7 + day_offset + 1}"
                schedule.append({
                    "date": target.strftime("%Y-%m-%d"),
                    "day_of_week": day_names[target.weekday()],
                    "time_ist": default_times[day_offset % len(default_times)],
                    "content_title": title,
                    "content_type": ctype,
                    "submission_id": sub_id,
                    "recommendation_id": rec_id,
                    "confidence_score": 0.6,
                })

    # Store the generated schedule
    now = datetime.now(timezone.utc).isoformat()
    schedule_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "suggestions": schedule,
        "generated_at": now,
        "weeks_ahead": weeks_ahead,
        "total_suggestions": len(schedule)
    }

    await db.calendar_suggestions.insert_one(schedule_doc)
    schedule_doc.pop("_id", None)

    return {
        "status": "complete",
        "suggestion_count": len(schedule),
        "schedule": schedule_doc
    }


async def get_latest_schedule(db, user_id: str) -> Optional[Dict[str, Any]]:
    """Get the most recent calendar suggestions for a user."""
    doc = await db.calendar_suggestions.find_one(
        {"user_id": user_id},
        {"_id": 0},
        sort=[("generated_at", -1)]
    )
    return doc


async def apply_suggestion(
    db,
    user_id: str,
    suggestion_date: str,
    suggestion_time: str,
    content_type: str,
    submission_id: Optional[str] = None,
    recommendation_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Apply a single calendar suggestion.
    - If scheduled: updates the submission's release date
    - If idea: creates a new submission from the recommendation
    """
    if content_type == "scheduled" and submission_id:
        # Update existing submission with the scheduled date
        await db.submissions.update_one(
            {"id": submission_id, "clientId": user_id},
            {
                "$set": {
                    "releaseDate": suggestion_date,
                    "status": "SCHEDULED",
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return {"status": "applied", "type": "scheduled", "submission_id": submission_id}
    
    elif content_type == "idea" and recommendation_id:
        # Create a new submission from the recommendation
        # Get the recommendation details
        rec_doc = await db.fvs_recommendations.find_one(
            {"clientId": user_id},
            {"_id": 0},
            sort=[("generatedAt", -1)]
        )
        
        rec_title = "New Content Idea"
        if rec_doc and rec_doc.get("recommendations"):
            for rec in rec_doc["recommendations"]:
                if rec.get("title") == recommendation_id or rec.get("topic") == recommendation_id:
                    rec_title = rec.get("title", rec.get("topic", "New Content Idea"))
                    break
        
        # Create the submission
        new_submission = {
            "id": str(uuid.uuid4()),
            "clientId": user_id,
            "title": rec_title,
            "description": "Created from AI recommendation",
            "contentType": "Short",
            "status": "SCHEDULED",
            "priority": "High",
            "releaseDate": suggestion_date,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.submissions.insert_one(new_submission)
        new_submission.pop("_id", None)
        
        return {
            "status": "applied",
            "type": "idea",
            "submission_id": new_submission["id"],
            "submission": new_submission
        }
    
    return {"status": "error", "error": "Invalid suggestion type or missing ID"}
