"""Strategy Session Pydantic models."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StrategySessionCreate(BaseModel):
    topic: str
    target_audience: str = ""
    tone: str = ""
    goal: str = "educate"
    ai_model: str = "gemini"
    submission_id: Optional[str] = None


class StrategySessionUpdate(BaseModel):
    research_output: Optional[str] = None
    outline_output: Optional[str] = None
    script_output: Optional[str] = None
    metadata_output: Optional[str] = None


class StrategySessionListItem(BaseModel):
    id: str
    title: str
    topic: str
    ai_model: str
    created_at: str
    updated_at: str
    submission_id: Optional[str] = None


class StrategySessionFull(BaseModel):
    id: str
    user_id: str
    submission_id: Optional[str] = None
    topic: str
    target_audience: str
    tone: str
    goal: str
    ai_model: str
    research_output: Optional[str] = None
    outline_output: Optional[str] = None
    script_output: Optional[str] = None
    metadata_output: Optional[str] = None
    title: str
    created_at: str
    updated_at: str
