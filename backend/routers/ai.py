"""AI generation routes."""
from fastapi import APIRouter, Depends, HTTPException, Request
import os

from models.ai import AIGenerateRequest
from services.auth_service import get_current_user
from services.ai_service import call_llm, call_gemini, get_enabled_llm_providers, get_enabled_video_providers

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


@router.post("/ai/suggest-schedule")
async def suggest_schedule(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """
    AI-powered publish schedule recommendations.

    Analyses the client's existing submission release dates and historical
    publishing patterns, then calls Gemini to recommend optimal publish slots
    for the next 7 days with day-of-week and time-of-day reasoning.

    Returns: { suggestions: [{date, dayOfWeek, reason, contentType, priority}], insight: str }
    """
    from db.mongo import get_db
    from services.auth_service import get_client_id_from_user
    import json as _json
    from datetime import datetime, timezone, timedelta

    client_id = get_client_id_from_user(user, data.get("impersonateClientId"))
    db = get_db()

    # Gather last 60 submissions to analyse patterns
    subs = await db.submissions.find(
        {"clientId": client_id, "status": {"$ne": "DELETED"}},
        {"_id": 0, "status": 1, "contentType": 1, "releaseDate": 1, "priority": 1, "title": 1}
    ).sort("createdAt", -1).to_list(60)

    pipeline_summary = {}
    published_days: list[str] = []
    content_mix: dict[str, int] = {}
    for s in subs:
        st = s.get("status", "INTAKE")
        pipeline_summary[st] = pipeline_summary.get(st, 0) + 1
        ct = s.get("contentType", "Unknown")
        content_mix[ct] = content_mix.get(ct, 0) + 1
        if st == "PUBLISHED" and s.get("releaseDate"):
            try:
                d = datetime.fromisoformat(s["releaseDate"])
                published_days.append(d.strftime("%A"))
            except Exception:
                pass

    # Build context for Gemini
    today = datetime.now(timezone.utc)
    next_7 = [(today + timedelta(days=i)).strftime("%Y-%m-%d (%A)") for i in range(1, 8)]
    pending_content = [s for s in subs if s.get("status") in ("INTAKE", "EDITING", "DESIGN")]

    prompt = f"""You are a YouTube/short-form content calendar expert.

Client pipeline summary: {_json.dumps(pipeline_summary)}
Historical publish day distribution: {published_days[-20:] if published_days else 'no data yet'}
Content type mix: {_json.dumps(content_mix)}
Pending content (ready to schedule): {len(pending_content)} items
Content types pending: {list(set(s.get('contentType','') for s in pending_content[:5]))}

Available dates next 7 days: {next_7}

Recommend 3-5 optimal publish dates from the list above. For each:
- Choose the best day/time for maximum reach
- Prefer Tue/Wed/Thu for most content types; Mon for motivational; Fri for entertaining
- Space releases at least 2 days apart
- Match content type to audience availability patterns

Return ONLY valid JSON (no markdown):
{{
  "suggestions": [
    {{
      "date": "YYYY-MM-DD",
      "dayOfWeek": "Tuesday",
      "timeOfDay": "18:00 UTC",
      "reason": "one sentence why",
      "priority": "High|Medium|Low"
    }}
  ],
  "insight": "2-3 sentence overall scheduling strategy insight for this client"
}}"""

    try:
        raw = await call_gemini(prompt)
        result = _json.loads(raw.strip().lstrip("```json").rstrip("```").strip())
    except Exception:
        # Graceful fallback when Gemini is unavailable
        result = {
            "suggestions": [
                {"date": (today + timedelta(days=2)).strftime("%Y-%m-%d"), "dayOfWeek": (today + timedelta(days=2)).strftime("%A"), "timeOfDay": "18:00 UTC", "reason": "Mid-week posts reach peak audience", "priority": "High"},
                {"date": (today + timedelta(days=4)).strftime("%Y-%m-%d"), "dayOfWeek": (today + timedelta(days=4)).strftime("%A"), "timeOfDay": "17:00 UTC", "reason": "Thu/Fri evening engagement spike", "priority": "Medium"},
                {"date": (today + timedelta(days=7)).strftime("%Y-%m-%d"), "dayOfWeek": (today + timedelta(days=7)).strftime("%A"), "timeOfDay": "10:00 UTC", "reason": "Weekend morning viewing window", "priority": "Low"},
            ],
            "insight": "Schedule content on Tue-Thu 17-19 UTC for best reach based on typical YouTube viewing patterns.",
        }

    return result


@router.post("/ai/analyze-comments")
async def analyze_comments(request: Request, data: dict, user: dict = Depends(get_current_user)):
    """
    YouTube Comment Intelligence — mine comments for content ideas.

    Fetches the top 100 comments from a YouTube video URL, passes them to
    Gemini for thematic analysis, and returns structured insights:
    - Recurring themes and questions
    - Audience pain points
    - Content idea suggestions
    - Sentiment summary

    Requires YOUTUBE_API_KEY env var for live data; returns mock data otherwise.
    """
    import os
    import re
    import json as _json

    video_url = data.get("videoUrl") or data.get("url", "")
    if not video_url:
        raise HTTPException(status_code=400, detail="videoUrl is required")

    # Extract video ID
    vid_match = re.search(r"(?:v=|youtu\.be/|shorts/)([A-Za-z0-9_-]{11})", video_url)
    if not vid_match:
        raise HTTPException(status_code=400, detail="Could not extract YouTube video ID from URL")
    video_id = vid_match.group(1)

    # Fetch comments via YouTube Data API v3
    yt_key = os.getenv("YOUTUBE_API_KEY")
    comments_text = ""
    is_mocked = False

    if yt_key:
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    "https://www.googleapis.com/youtube/v3/commentThreads",
                    params={
                        "part": "snippet",
                        "videoId": video_id,
                        "maxResults": 100,
                        "order": "relevance",
                        "key": yt_key,
                    },
                    timeout=15,
                )
                res.raise_for_status()
                items = res.json().get("items", [])
                comments_text = "\n".join(
                    item["snippet"]["topLevelComment"]["snippet"]["textDisplay"]
                    for item in items
                )
        except Exception as e:
            comments_text = ""
            is_mocked = True

    if not comments_text:
        is_mocked = True
        comments_text = """Great video! Can you do one on pricing strategies?
I've been struggling with this exact problem for months.
What tools do you use for this?
This changed how I think about content. More please!
The part about {{topic}} was gold — do a deep dive on that?
Can you cover the beginner version of this?
I tried this and it worked! Thanks so much.
What about for B2B companies — does this apply?
Would love to see a follow-up on the advanced techniques.
This is exactly what I needed to hear today."""

    prompt = f"""You are a content strategist analysing YouTube comments to extract content intelligence.

Video URL: {video_url}
Comments ({len(comments_text.split(chr(10)))} comments):
{comments_text[:4000]}

Analyse these comments and return ONLY valid JSON (no markdown):
{{
  "themes": [
    {{"theme": "string", "frequency": "high|medium|low", "example": "direct quote from comments"}}
  ],
  "audienceQuestions": ["question 1", "question 2", "question 3"],
  "painPoints": ["pain point 1", "pain point 2"],
  "contentIdeas": [
    {{"title": "video title idea", "type": "Short|Tutorial|Deep-dive", "rationale": "why this would perform"}}
  ],
  "sentiment": {{"positive": 70, "neutral": 20, "negative": 10}},
  "topRequest": "the single most requested follow-up topic"
}}"""

    try:
        raw = await call_gemini(prompt)
        result = _json.loads(raw.strip().lstrip("```json").rstrip("```").strip())
    except Exception:
        # Graceful fallback when Gemini is unavailable or response unparseable
        is_mocked = True
        result = {
            "themes": [
                {"theme": "Audience engagement", "frequency": "high", "example": "Great video!"},
                {"theme": "Follow-up requests", "frequency": "medium", "example": "Can you do more on this?"},
            ],
            "audienceQuestions": [
                "Can you do a deeper dive on this topic?",
                "What tools do you recommend?",
                "Is there a beginner version?",
            ],
            "painPoints": ["Lack of actionable steps", "Too advanced for beginners"],
            "contentIdeas": [
                {"title": "Beginner's Guide to the Topic", "type": "Tutorial", "rationale": "Many viewers requested basics"},
                {"title": "Top Tools Breakdown", "type": "Short", "rationale": "Frequent tool questions in comments"},
            ],
            "sentiment": {"positive": 70, "neutral": 20, "negative": 10},
            "topRequest": "A follow-up video with more practical examples",
        }

    result["videoId"] = video_id
    result["isMocked"] = is_mocked
    return result
