"""AI generation routes."""
from fastapi import APIRouter, Depends, HTTPException
import os

from models.ai import AIGenerateRequest
from services.auth_service import get_current_user
from services.ai_service import call_llm, get_enabled_llm_providers, get_enabled_video_providers

router = APIRouter(tags=["ai"])


@router.get("/ai/capabilities")
async def get_ai_capabilities():
    """Returns enabled AI providers based on configuration."""
    return {
        "llmProviders": get_enabled_llm_providers(),
        "videoProviders": get_enabled_video_providers()
    }


@router.post("/ai/generate")
async def ai_generate(data: AIGenerateRequest, user: dict = Depends(get_current_user)):
    """Universal AI generation endpoint supporting multiple LLM providers."""
    valid_providers = ["gemini", "openai", "anthropic"]
    valid_tasks = ["research", "outline", "script", "title", "description", "tags", "chapters", "youtube_package"]
    
    if data.provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")
    
    if data.task not in valid_tasks:
        raise HTTPException(status_code=400, detail=f"Invalid task. Must be one of: {valid_tasks}")
    
    result = await call_llm(data.provider, data.task, data.input)
    return result
