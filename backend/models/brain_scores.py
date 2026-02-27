"""
Brain Scores model for Sprint 12 - Brain Feedback Loop.
Tracks AI recommendation predictions vs actual performance.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BrainScoreCreate(BaseModel):
    user_id: str
    recommendation_id: str
    submission_id: str
    predicted_tier: str  # "High" | "Medium"
    predicted_title: str


class BrainScoreResponse(BaseModel):
    id: str
    user_id: str
    recommendation_id: str
    submission_id: str
    predicted_tier: str
    predicted_title: str
    actual_views: Optional[int] = None
    actual_likes: Optional[int] = None
    performance_verdict: str  # "correct" | "incorrect" | "pending"
    verdict_reasoning: Optional[str] = None
    scored_at: Optional[str] = None
    created_at: str


class BrainScoresSummary(BaseModel):
    total_predictions: int
    scored: int
    pending: int
    correct: int
    incorrect: int
    accuracy_percentage: float
    scores: List[BrainScoreResponse]


class WeeklyAccuracy(BaseModel):
    week: str
    predictions: int
    correct: int
    accuracy: float


class LeaderboardEntry(BaseModel):
    title: str
    predicted_tier: str
    actual_views: int
    verdict: str
