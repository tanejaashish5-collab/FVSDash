"""
Brain Feedback Loop Service - Sprint 12/13
Tracks AI recommendation predictions vs actual video performance.
Includes Challenge tracking with 30-day deadlines.
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Performance thresholds for Brain accuracy evaluation
TIER_THRESHOLDS = {
    "High": 5000,    # predicted High = actual views >= 5000
    "Medium": 1000,  # predicted Medium = actual views >= 1000
}

# Challenge deadline: 30 days to collect enough view data
CHALLENGE_DAYS = 30


async def create_brain_score(
    db,
    user_id: str,
    recommendation_id: str,
    submission_id: str,
    predicted_tier: str,
    predicted_title: str
) -> Dict[str, Any]:
    """
    Create a brain_scores record when a submission is created from a recommendation.
    """
    now = datetime.now(timezone.utc).isoformat()
    
    score_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "recommendation_id": recommendation_id,
        "submission_id": submission_id,
        "predicted_tier": predicted_tier,
        "predicted_title": predicted_title,
        "actual_views": None,
        "actual_likes": None,
        "performance_verdict": "pending",
        "verdict_reasoning": None,
        "scored_at": None,
        "created_at": now
    }
    
    await db.brain_scores.insert_one(score_doc)
    score_doc.pop("_id", None)
    
    logger.info(f"Brain score created for submission {submission_id} with predicted tier {predicted_tier}")
    return score_doc


async def score_pending_predictions(db, client_id: str) -> Dict[str, Any]:
    """
    Evaluate all pending brain_scores against actual YouTube analytics.
    Called after analytics sync completes.
    """
    result = {
        "scored": 0,
        "still_pending": 0,
        "errors": []
    }
    
    try:
        # Find all pending brain_scores for this user
        pending_scores = await db.brain_scores.find({
            "user_id": client_id,
            "performance_verdict": "pending"
        }).to_list(100)
        
        for score in pending_scores:
            submission_id = score.get("submission_id")
            
            # Get the submission to find youtube_video_id
            submission = await db.submissions.find_one(
                {"id": submission_id},
                {"_id": 0, "youtube_video_id": 1, "title": 1}
            )
            
            if not submission or not submission.get("youtube_video_id"):
                result["still_pending"] += 1
                continue
            
            video_id = submission.get("youtube_video_id")
            
            # Look up analytics data for this video
            analytics = await db.youtube_analytics.find_one(
                {"videoId": video_id},
                {"_id": 0, "views": 1, "likes": 1}
            )
            
            if not analytics:
                result["still_pending"] += 1
                continue
            
            # Evaluate the prediction
            actual_views = analytics.get("views", 0)
            actual_likes = analytics.get("likes", 0)
            predicted_tier = score.get("predicted_tier", "Medium")
            
            threshold = TIER_THRESHOLDS.get(predicted_tier, 1000)
            is_correct = actual_views >= threshold
            
            verdict = "correct" if is_correct else "incorrect"
            reasoning = f"Predicted {predicted_tier} (≥{threshold:,} views). Actual: {actual_views:,} views. {'✅ Correct' if is_correct else '❌ Incorrect'}"
            
            # Update the brain_score record
            await db.brain_scores.update_one(
                {"id": score["id"]},
                {
                    "$set": {
                        "actual_views": actual_views,
                        "actual_likes": actual_likes,
                        "performance_verdict": verdict,
                        "verdict_reasoning": reasoning,
                        "scored_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            result["scored"] += 1
            logger.info(f"Scored prediction for submission {submission_id}: {verdict}")
            
    except Exception as e:
        logger.exception("Error scoring brain predictions")
        result["errors"].append(str(e))
    
    return result


async def get_brain_scores(db, user_id: str) -> Dict[str, Any]:
    """
    Get all brain scores for a user with summary statistics.
    """
    scores = await db.brain_scores.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    total = len(scores)
    scored = sum(1 for s in scores if s.get("performance_verdict") != "pending")
    pending = sum(1 for s in scores if s.get("performance_verdict") == "pending")
    correct = sum(1 for s in scores if s.get("performance_verdict") == "correct")
    incorrect = sum(1 for s in scores if s.get("performance_verdict") == "incorrect")
    
    accuracy = (correct / scored * 100) if scored > 0 else 0.0
    
    return {
        "total_predictions": total,
        "scored": scored,
        "pending": pending,
        "correct": correct,
        "incorrect": incorrect,
        "accuracy_percentage": round(accuracy, 1),
        "scores": scores
    }


async def get_accuracy_trend(db, user_id: str) -> List[Dict[str, Any]]:
    """
    Get weekly accuracy trend for a user.
    Returns data grouped by ISO week.
    """
    scores = await db.brain_scores.find(
        {"user_id": user_id, "performance_verdict": {"$ne": "pending"}},
        {"_id": 0, "created_at": 1, "performance_verdict": 1}
    ).to_list(1000)
    
    # Group by week
    weekly_data = {}
    for score in scores:
        created_at = score.get("created_at", "")
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            week = dt.strftime("%Y-W%V")
        except (ValueError, TypeError):
            continue
        
        if week not in weekly_data:
            weekly_data[week] = {"predictions": 0, "correct": 0}
        
        weekly_data[week]["predictions"] += 1
        if score.get("performance_verdict") == "correct":
            weekly_data[week]["correct"] += 1
    
    # Convert to list sorted by week
    result = []
    for week, data in sorted(weekly_data.items()):
        accuracy = (data["correct"] / data["predictions"] * 100) if data["predictions"] > 0 else 0
        result.append({
            "week": week,
            "predictions": data["predictions"],
            "correct": data["correct"],
            "accuracy": round(accuracy, 1)
        })
    
    return result


async def get_leaderboard(db, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Get top predicted Shorts by actual views (correct predictions only).
    """
    scores = await db.brain_scores.find(
        {
            "user_id": user_id,
            "performance_verdict": "correct",
            "actual_views": {"$ne": None}
        },
        {"_id": 0}
    ).sort("actual_views", -1).limit(limit).to_list(limit)
    
    return [
        {
            "title": s.get("predicted_title", "Untitled"),
            "predicted_tier": s.get("predicted_tier", "Medium"),
            "actual_views": s.get("actual_views", 0),
            "verdict": s.get("performance_verdict", "pending")
        }
        for s in scores
    ]


async def get_recommendation_by_id(db, client_id: str, rec_index: int = 0) -> Optional[Dict[str, Any]]:
    """
    Get a specific recommendation from the latest recommendations document.
    Used to fetch predicted_tier when creating a submission.
    """
    rec_doc = await db.fvs_recommendations.find_one(
        {"clientId": client_id},
        {"_id": 0},
        sort=[("generatedAt", -1)]
    )
    
    if not rec_doc or not rec_doc.get("recommendations"):
        return None
    
    recs = rec_doc.get("recommendations", [])
    if rec_index < len(recs):
        return recs[rec_index]
    
    return None
