"""AI generation routes."""
from fastapi import APIRouter, Depends, HTTPException, Request
import os

from models.ai import AIGenerateRequest
from services.auth_service import get_current_user
from services.ai_service import call_llm, get_enabled_llm_providers, get_enabled_video_providers

router = APIRouter(tags=["ai"])

# Rate limiter — imported from main app state via request
def _get_limiter():
    from main import limiter
    return limiter


@router.get("/ai/capabilities")
async def get_ai_capabilities():
    """Returns enabled AI providers based on configuration."""
    return {
        "llmProviders": get_enabled_llm_providers(),
        "videoProviders": get_enabled_video_providers()
    }


@router.post("/ai/generate")
async def ai_generate(request: Request, data: AIGenerateRequest, user: dict = Depends(get_current_user)):
    """Universal AI generation endpoint supporting multiple LLM providers."""
    valid_providers = ["gemini", "openai", "anthropic"]
    valid_tasks = ["research", "outline", "script", "title", "description", "tags", "chapters", "youtube_package", "propose_ideas"]

    if data.provider not in valid_providers:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Must be one of: {valid_providers}")

    if data.task not in valid_tasks:
        raise HTTPException(status_code=400, detail=f"Invalid task. Must be one of: {valid_tasks}")

    result = await call_llm(data.provider, data.task, data.input)
    return result


@router.post("/ai/generate-thumbnail")
async def generate_thumbnail_endpoint(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """Generate a thumbnail image using DALL-E for a given topic/script."""
    from services.media_service import generate_thumbnail
    topic = data.get("topic", "")
    tone = data.get("tone", "")
    title = data.get("title", topic)
    # Accept custom_prompt under either key name
    custom_prompt = data.get("customPrompt") or data.get("custom_prompt") or None
    if not topic:
        raise HTTPException(status_code=400, detail="topic is required")
    result = await generate_thumbnail(
        topic=topic, brand_voice=tone, title=title, format="short",
        custom_prompt=custom_prompt,
    )
    return {"url": result.url, "isMocked": result.is_mocked, "warning": getattr(result, "warning", None)}


@router.post("/ai/generate-voice")
async def generate_voice(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """Generate voiceover audio using ElevenLabs."""
    from services.media_service import generate_voice_for_script
    text = data.get("text", "")
    voice_id = data.get("voice_id")
    model_id = data.get("model_id", "eleven_multilingual_v2")
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long (max 5000 chars)")
    result = await generate_voice_for_script(
        script_text=text,
        voice_id=voice_id,
        model_id=model_id
    )
    return result


@router.post("/ai/generate-captions")
async def generate_captions(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """Generate SRT/VTT captions from an audio URL using OpenAI Whisper."""
    from services.media_service import generate_captions_from_audio
    audio_url = data.get("audioUrl") or data.get("audio_url", "")
    if not audio_url:
        raise HTTPException(status_code=400, detail="audioUrl is required")
    result = await generate_captions_from_audio(audio_url)
    return result


@router.post("/ai/score-script")
async def score_script(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """
    Score a script's predicted performance before production.
    Returns tier (BREAKOUT/SOLID/AVERAGE/UNDERPERFORM), score 0-100, and suggestions.
    """
    from services.ai_service import score_script_content
    script_text = data.get("scriptText") or data.get("script_text", "")
    topic = data.get("topic", "")
    target_format = data.get("format", "short")
    if not script_text:
        raise HTTPException(status_code=400, detail="scriptText is required")
    result = await score_script_content(script_text, topic, target_format)
    return result


@router.post("/ai/preview-voices")
async def preview_voices(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """Generate short audio previews of multiple ElevenLabs voices."""
    from services.media_service import preview_multiple_voices
    preview_text = data.get("text", "Yaar, yeh suno — content creation ka asli raaz aaj main batata hoon.")
    voice_ids = data.get("voiceIds")  # Optional: override default set
    result = await preview_multiple_voices(preview_text, voice_ids)
    return result
