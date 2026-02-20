"""
Brain Feedback Loop API routes - Sprint 12
Endpoints for tracking AI recommendation accuracy.
"""
from fastapi import APIRouter, Depends
from typing import List

from services.auth_service import get_current_user, get_client_id_from_user
from services import brain_service
from db.mongo import get_db

router = APIRouter(prefix="/brain", tags=["brain"])


@router.get("/scores")
async def get_brain_scores(user: dict = Depends(get_current_user)):
    """
    Get all brain scores for the current user with summary statistics.
    Returns:
      - total_predictions
      - scored (evaluated)
      - pending (awaiting data)
      - correct
      - incorrect
      - accuracy_percentage
      - scores array
    """
    client_id = get_client_id_from_user(user)
    db = get_db()
    return await brain_service.get_brain_scores(db, client_id)


@router.get("/accuracy-trend")
async def get_accuracy_trend(user: dict = Depends(get_current_user)):
    """
    Get weekly accuracy trend for the current user.
    Returns array of: { week, predictions, correct, accuracy }
    """
    client_id = get_client_id_from_user(user)
    db = get_db()
    return await brain_service.get_accuracy_trend(db, client_id)


@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 5,
    user: dict = Depends(get_current_user)
):
    """
    Get top predicted Shorts by actual views (correct predictions only).
    Returns array of: { title, predicted_tier, actual_views, verdict }
    """
    client_id = get_client_id_from_user(user)
    db = get_db()
    return await brain_service.get_leaderboard(db, client_id, limit)


@router.get("/active-challenges")
async def get_active_challenges(user: dict = Depends(get_current_user)):
    """
    Get active (pending) brain predictions ordered by days_remaining (most urgent first).
    Returns: { active_challenges: [...], total_active: N }
    """
    client_id = get_client_id_from_user(user)
    db = get_db()
    return await brain_service.get_active_challenges(db, client_id)
