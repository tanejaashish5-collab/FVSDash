"""Strategy session routes for persistence and history."""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import List
import uuid

from models.strategy_session import (
    StrategySessionCreate, StrategySessionUpdate, 
    StrategySessionListItem, StrategySessionFull
)
from services.auth_service import get_current_user
from db.mongo import strategy_sessions_collection

router = APIRouter(prefix="/strategy", tags=["strategy"])


def generate_title(topic: str, max_len: int = 60) -> str:
    """Generate a session title from the topic (first 60 chars)."""
    if not topic:
        return "Untitled Session"
    return topic[:max_len].strip()


@router.get("/sessions", response_model=List[StrategySessionListItem])
async def list_sessions(user: dict = Depends(get_current_user)):
    """
    List current user's strategy sessions, ordered by updated_at DESC.
    Returns up to 50 most recent sessions.
    """
    db = strategy_sessions_collection()
    
    sessions = await db.find(
        {"user_id": user["id"]},
        {
            "_id": 0,
            "id": 1,
            "title": 1,
            "topic": 1,
            "ai_model": 1,
            "created_at": 1,
            "updated_at": 1,
            "submission_id": 1
        }
    ).sort("updated_at", -1).limit(50).to_list(50)
    
    return sessions


@router.post("/sessions", response_model=StrategySessionFull)
async def create_session(data: StrategySessionCreate, user: dict = Depends(get_current_user)):
    """
    Create a new strategy session.
    """
    db = strategy_sessions_collection()
    
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    title = generate_title(data.topic)
    
    session_doc = {
        "id": session_id,
        "user_id": user["id"],
        "submission_id": data.submission_id,
        "topic": data.topic,
        "target_audience": data.target_audience,
        "tone": data.tone,
        "goal": data.goal,
        "ai_model": data.ai_model,
        "research_output": None,
        "outline_output": None,
        "script_output": None,
        "metadata_output": None,
        "title": title,
        "created_at": now,
        "updated_at": now
    }
    
    await db.insert_one(session_doc)
    
    # Return without _id
    session_doc.pop("_id", None)
    return session_doc


@router.get("/sessions/{session_id}", response_model=StrategySessionFull)
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    """
    Get a single strategy session by ID.
    Returns 403 if session belongs to a different user.
    """
    db = strategy_sessions_collection()
    
    session = await db.find_one({"id": session_id}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return session


@router.patch("/sessions/{session_id}", response_model=StrategySessionFull)
async def update_session(
    session_id: str, 
    data: StrategySessionUpdate, 
    user: dict = Depends(get_current_user)
):
    """
    Partial update of a strategy session.
    Used to save each tab's output as it's generated.
    """
    db = strategy_sessions_collection()
    
    # Check session exists and belongs to user
    session = await db.find_one({"id": session_id}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build update dict from provided fields
    update_fields = {}
    if data.research_output is not None:
        update_fields["research_output"] = data.research_output
    if data.outline_output is not None:
        update_fields["outline_output"] = data.outline_output
    if data.script_output is not None:
        update_fields["script_output"] = data.script_output
    if data.metadata_output is not None:
        update_fields["metadata_output"] = data.metadata_output
    if data.audio_url is not None:
        update_fields["audio_url"] = data.audio_url
    if data.thumbnail_url is not None:
        update_fields["thumbnail_url"] = data.thumbnail_url
    if data.video_task_id is not None:
        update_fields["video_task_id"] = data.video_task_id
    if data.video_url is not None:
        update_fields["video_url"] = data.video_url
    
    if update_fields:
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.update_one({"id": session_id}, {"$set": update_fields})
    
    # Return updated session
    updated_session = await db.find_one({"id": session_id}, {"_id": 0})
    return updated_session


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user: dict = Depends(get_current_user)):
    """
    Delete a strategy session.
    Returns 403 if session belongs to a different user.
    """
    db = strategy_sessions_collection()
    
    # Check session exists and belongs to user
    session = await db.find_one({"id": session_id}, {"_id": 0, "user_id": 1})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.delete_one({"id": session_id})
    
    return {"message": "Session deleted"}
