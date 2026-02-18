"""FVS System service - Brain & Orchestrator for autonomous content creation."""
import os
import uuid
import random
import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import HTTPException

from db.mongo import (
    fvs_ideas_collection, fvs_brain_snapshots_collection,
    fvs_activity_collection, fvs_config_collection, fvs_scripts_collection,
    analytics_snapshots_collection, client_settings_collection,
    submissions_collection, assets_collection, video_tasks_collection
)
from services.media_service import (
    generate_voice_for_script, generate_thumbnail,
    AudioGenerationResult, ThumbnailGenerationResult
)

logger = logging.getLogger(__name__)

# Sample external signals for idea generation (simulated data)
SIMULATED_EXTERNAL_SIGNALS = [
    {"source": "youtube_analytics", "topic": "Short-form content tips", "trend": "rising"},
    {"source": "reddit", "topic": "Podcast equipment reviews", "trend": "hot"},
    {"source": "search_trends", "topic": "AI voice generation", "trend": "breakout"},
    {"source": "youtube_analytics", "topic": "Monetization strategies", "trend": "steady"},
    {"source": "reddit", "topic": "Content repurposing workflows", "trend": "emerging"},
    {"source": "search_trends", "topic": "Video podcast format", "trend": "rising"},
    {"source": "competitor_analysis", "topic": "Interview techniques", "trend": "evergreen"},
    {"source": "audience_feedback", "topic": "Behind-the-scenes content", "trend": "requested"},
]


def generate_mock_ideas(target_format: str) -> list:
    """Generate mock ideas when LLM is unavailable."""
    mock_ideas = [
        {"topic": "5 Podcast Editing Mistakes That Kill Your Audience Retention", "hypothesis": "Editing tips consistently perform well, and this angle addresses a pain point", "source": "youtube_analytics", "format": target_format, "convictionScore": 0.85},
        {"topic": "I Tried AI Voice Cloning for My Podcast - Here's What Happened", "hypothesis": "AI content is trending, and personal experiments drive engagement", "source": "search_trends", "format": target_format, "convictionScore": 0.78},
        {"topic": "The $50 Mic Setup That Sounds Like $500", "hypothesis": "Budget content resonates with beginners, high search volume", "source": "reddit", "format": target_format, "convictionScore": 0.72},
        {"topic": "How Top Podcasters Repurpose One Episode Into 10 Pieces of Content", "hypothesis": "Content multiplication is a hot topic in creator communities", "source": "competitor_analysis", "format": target_format, "convictionScore": 0.80},
        {"topic": "Behind the Scenes: How We Produce an Episode in 2 Hours", "hypothesis": "Audience requested more process content, builds trust", "source": "audience_feedback", "format": target_format, "convictionScore": 0.68},
    ]
    return mock_ideas[:5]


async def generate_ideas_with_llm(client_id: str, analytics_data: dict, brand_voice: str, target_format: str) -> list:
    """Use LLM to generate FVS ideas based on analytics and external signals."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return generate_mock_ideas(target_format)
    
    top_topics = analytics_data.get("topTopics", ["content creation", "podcasting", "AI tools"])
    recent_performance = analytics_data.get("performance", "moderate growth")
    
    external_signals = random.sample(SIMULATED_EXTERNAL_SIGNALS, min(4, len(SIMULATED_EXTERNAL_SIGNALS)))
    signals_text = "\n".join([f"- {s['source']}: '{s['topic']}' ({s['trend']})" for s in external_signals])
    
    prompt = f"""You are an AI content strategist for a podcast/video production studio.

Based on the following data, generate 5 creative episode ideas in JSON format.

CLIENT CONTEXT:
- Brand voice: {brand_voice or 'Professional and engaging'}
- Target format: {target_format} ({"60-90 second vertical videos" if target_format == "short" else "15-45 minute full episodes"})
- Top performing topics: {', '.join(top_topics)}
- Recent performance: {recent_performance}

TRENDING SIGNALS:
{signals_text}

Generate 5 episode ideas. For each idea, provide:
1. topic: A specific, actionable topic title
2. hypothesis: Why this will resonate with the audience (1-2 sentences)
3. source: Which signal inspired this (youtube_analytics, reddit, search_trends, competitor_analysis, audience_feedback, or original)
4. format: "{target_format}"
5. convictionScore: 0.0-1.0 based on how confident you are

Return ONLY valid JSON array, no markdown:
[{{"topic": "...", "hypothesis": "...", "source": "...", "format": "...", "convictionScore": 0.0}}]"""

    try:
        session_id = f"fvs-brain-{uuid.uuid4()}"
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message="You are a strategic content advisor. Always respond with valid JSON only."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        
        ideas = json.loads(cleaned)
        return ideas if isinstance(ideas, list) else []
        
    except Exception as e:
        logger.error(f"FVS idea generation LLM error: {e}")
        return generate_mock_ideas(target_format)


async def propose_ideas(client_id: str, format: str, range: str) -> dict:
    """FVS Brain: Analyze client data and propose new episode ideas."""
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required")
    
    now = datetime.now(timezone.utc).isoformat()
    
    try:
        range_days = {"30d": 30, "90d": 90}.get(range, 30)
        today = datetime.now(timezone.utc).date()
        start_date = (today - timedelta(days=range_days)).isoformat()
        
        analytics_db = analytics_snapshots_collection()
        analytics = await analytics_db.find(
            {"clientId": client_id, "date": {"$gte": start_date}},
            {"_id": 0}
        ).to_list(1000)
        
        total_downloads = sum(a.get("downloads", 0) for a in analytics)
        total_views = sum(a.get("views", 0) for a in analytics)
        episodes_published = sum(a.get("episodesPublished", 0) for a in analytics)
        
        settings_db = client_settings_collection()
        settings = await settings_db.find_one({"clientId": client_id}, {"_id": 0})
        brand_voice = settings.get("brandVoiceDescription", "") if settings else ""
        
        submissions_db = submissions_collection()
        recent_subs = await submissions_db.find(
            {"clientId": client_id, "status": {"$in": ["PUBLISHED", "SCHEDULED"]}},
            {"_id": 0, "title": 1, "contentType": 1}
        ).sort("createdAt", -1).to_list(10)
        
        top_topics = [s["title"] for s in recent_subs[:5]] if recent_subs else ["content creation", "podcasting"]
        
        analytics_context = {
            "topTopics": top_topics,
            "performance": f"{total_downloads} downloads, {total_views} views, {episodes_published} episodes in {range_days} days"
        }
        
        raw_ideas = await generate_ideas_with_llm(client_id, analytics_context, brand_voice, format)
        
        ideas = []
        for idea_data in raw_ideas:
            idea = {
                "id": str(uuid.uuid4()),
                "clientId": client_id,
                "topic": idea_data.get("topic", "Untitled Idea"),
                "hypothesis": idea_data.get("hypothesis", ""),
                "source": idea_data.get("source", "original"),
                "format": idea_data.get("format", format),
                "convictionScore": min(1.0, max(0.0, float(idea_data.get("convictionScore", 0.5)))),
                "status": "proposed",
                "createdAt": now,
                "updatedAt": now
            }
            ideas.append(idea)
        
        ideas_db = fvs_ideas_collection()
        if ideas:
            await ideas_db.insert_many(ideas)
            for idea in ideas:
                if "_id" in idea:
                    del idea["_id"]
        
        patterns = [
            f"Format '{format}' episodes recommended based on current trends",
            f"Top performing topics: {', '.join(top_topics[:3])}",
            f"External signals suggest focus on AI and efficiency content",
            f"Audience engagement is {('strong' if total_views > 5000 else 'growing')}"
        ]
        
        snapshot = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "timeWindow": range,
            "summary": f"Analyzed {range_days} days of data. Generated {len(ideas)} {format}-format episode ideas based on {total_downloads} downloads and {total_views} views. Focus areas: trending AI topics, audience pain points, and content repurposing.",
            "topPatterns": patterns,
            "ideasGenerated": len(ideas),
            "createdAt": now
        }
        
        snapshots_db = fvs_brain_snapshots_collection()
        await snapshots_db.insert_one(snapshot)
        if "_id" in snapshot:
            del snapshot["_id"]
        
        activity = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "action": "propose_ideas",
            "description": f"FVS proposed {len(ideas)} new {format} ideas",
            "metadata": {"ideaCount": len(ideas), "format": format, "range": range},
            "createdAt": now
        }
        activity_db = fvs_activity_collection()
        await activity_db.insert_one(activity)
        
        logger.info(f"FVS proposed {len(ideas)} ideas for client {client_id}")
        
        return {
            "ideas": ideas,
            "snapshot": snapshot
        }
        
    except Exception as e:
        logger.error(f"FVS propose-ideas error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to propose ideas: {str(e)}")


# =============================================================================
# PRODUCTION PIPELINE STEPS (Refactored)
# =============================================================================

async def generate_script_for_idea(idea: dict, brand_voice: str) -> dict:
    """
    Step 1: Generate script from idea using LLM.
    
    Args:
        idea: The FVS idea dict
        brand_voice: Client's brand voice description
        
    Returns:
        Script dict with id, text, provider, etc.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    now = datetime.now(timezone.utc).isoformat()
    
    script_text = ""
    provider = "mock"
    
    try:
        if api_key:
            script_prompt = f"""Write a {idea.get('format', 'short')}-form script for this episode:

Topic: {idea.get('topic')}
Hypothesis/Angle: {idea.get('hypothesis')}
Brand Voice: {brand_voice}
Format: {"60-90 second vertical video script" if idea.get('format') == 'short' else "15-30 minute podcast episode"}

Write an engaging, conversational script that:
- Opens with a strong hook
- Delivers clear value
- Has a memorable closing/CTA

Write the full script text only, no stage directions or timestamps."""

            chat = LlmChat(
                api_key=api_key,
                session_id=f"fvs-script-{uuid.uuid4()}",
                system_message="You are an expert scriptwriter for podcasts and video content."
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            
            script_text = await chat.send_message(UserMessage(text=script_prompt))
            provider = "anthropic"
        else:
            script_text = f"[Auto-generated script for: {idea.get('topic')}]\n\nHey everyone! Today we're talking about {idea.get('topic')}.\n\n{idea.get('hypothesis')}\n\nLet's dive in...\n\n[Main content would go here]\n\nThat's it for today! Don't forget to like and subscribe."
            
    except Exception as e:
        logger.error(f"Script generation error: {e}")
        script_text = f"[Auto-generated script for: {idea.get('topic')}]\n\n{idea.get('hypothesis')}"
    
    return {
        "id": str(uuid.uuid4()),
        "text": script_text,
        "provider": provider,
        "fvsIdeaId": idea.get("id"),
        "createdAt": now
    }


async def generate_metadata_for_episode(idea: dict, script_text: str) -> dict:
    """
    Step 2: Generate YouTube metadata (title, description, tags) using LLM.
    """
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    title = idea.get("topic", "Untitled Episode")
    description = idea.get("hypothesis", "")
    tags = ["podcast", "content", idea.get("format", "short")]
    
    try:
        if api_key:
            metadata_prompt = f"""Generate YouTube metadata for this episode:

Topic: {idea.get('topic')}
Script excerpt: {script_text[:500]}

Provide:
1. TITLE: One catchy, SEO-friendly title (under 60 chars)
2. DESCRIPTION: 150-200 word description
3. TAGS: 10 relevant tags, comma-separated

Format your response exactly as:
TITLE: [title here]
DESCRIPTION: [description here]
TAGS: [tag1, tag2, tag3, ...]"""

            chat = LlmChat(
                api_key=api_key,
                session_id=f"fvs-metadata-{uuid.uuid4()}",
                system_message="You are a YouTube SEO expert."
            ).with_model("gemini", "gemini-2.5-flash")
            
            metadata_response = await chat.send_message(UserMessage(text=metadata_prompt))
            
            for line in metadata_response.split('\n'):
                if line.startswith('TITLE:'):
                    title = line.replace('TITLE:', '').strip()
                elif line.startswith('DESCRIPTION:'):
                    description = line.replace('DESCRIPTION:', '').strip()
                elif line.startswith('TAGS:'):
                    tags = [t.strip() for t in line.replace('TAGS:', '').split(',')]
    except Exception as e:
        logger.error(f"Metadata generation error: {e}")
    
    return {"title": title, "description": description, "tags": tags}


async def produce_episode(client_id: str, idea_id: str, mode: str) -> dict:
    """
    FVS Orchestrator: Produce a full episode from an approved idea.
    
    Pipeline Steps:
    1. Generate script using LLM
    2. Generate YouTube metadata using LLM
    3. Generate audio using ElevenLabs (REAL)
    4. Generate thumbnail using OpenAI GPT-Image-1 (REAL)
    5. Create video task (MOCKED - P2)
    6. Create Submission and Assets
    
    Returns same response structure as before for backwards compatibility.
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required")
    
    now = datetime.now(timezone.utc).isoformat()
    warnings: List[str] = []
    
    ideas_db = fvs_ideas_collection()
    settings_db = client_settings_collection()
    submissions_db = submissions_collection()
    scripts_db = fvs_scripts_collection()
    assets_db = assets_collection()
    video_tasks_db = video_tasks_collection()
    activity_db = fvs_activity_collection()
    
    try:
        # Fetch idea
        idea = await ideas_db.find_one({"id": idea_id, "clientId": client_id}, {"_id": 0})
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")
        
        await ideas_db.update_one(
            {"id": idea_id},
            {"$set": {"status": "in_progress", "updatedAt": now}}
        )
        
        # Get client settings
        settings = await settings_db.find_one({"clientId": client_id}, {"_id": 0})
        brand_voice = settings.get("brandVoiceDescription", "Professional and engaging") if settings else "Professional and engaging"
        
        # =================================================================
        # STEP 1: Generate Script
        # =================================================================
        logger.info(f"FVS Step 1: Generating script for idea '{idea.get('topic')}'")
        script_data = await generate_script_for_idea(idea, brand_voice)
        script_text = script_data["text"]
        
        # =================================================================
        # STEP 2: Generate Metadata
        # =================================================================
        logger.info("FVS Step 2: Generating YouTube metadata")
        metadata = await generate_metadata_for_episode(idea, script_text)
        title = metadata["title"]
        description = metadata["description"]
        tags = metadata["tags"]
        
        # =================================================================
        # STEP 3: Generate Audio (ElevenLabs - REAL)
        # =================================================================
        logger.info("FVS Step 3: Generating audio via ElevenLabs")
        audio_result: AudioGenerationResult = await generate_voice_for_script(script_text)
        
        if audio_result.warning:
            warnings.append(audio_result.warning)
            logger.warning(f"Audio generation warning: {audio_result.warning}")
        
        # =================================================================
        # STEP 4: Generate Thumbnail (OpenAI - REAL)
        # =================================================================
        logger.info("FVS Step 4: Generating thumbnail via OpenAI")
        thumbnail_result: ThumbnailGenerationResult = await generate_thumbnail(
            topic=idea.get("topic", ""),
            brand_voice=brand_voice,
            title=title,
            format=idea.get("format", "short"),
            provider="openai"
        )
        
        if thumbnail_result.warning:
            warnings.append(thumbnail_result.warning)
            logger.warning(f"Thumbnail generation warning: {thumbnail_result.warning}")
        
        # =================================================================
        # STEP 5: Create Submission
        # =================================================================
        logger.info("FVS Step 5: Creating Submission")
        release_date = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%d")
        submission = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "title": title,
            "guest": "",
            "description": description,
            "contentType": "Short" if idea.get("format") == "short" else "Podcast",
            "status": "EDITING",
            "priority": "High",
            "releaseDate": release_date,
            "sourceFileUrl": None,
            "fvsIdeaId": idea_id,
            "tags": tags,
            "createdAt": now,
            "updatedAt": now
        }
        await submissions_db.insert_one(submission)
        submission_id = submission["id"]
        if "_id" in submission:
            del submission["_id"]
        
        # =================================================================
        # STEP 6: Create Script Entity
        # =================================================================
        script = {
            "id": script_data["id"],
            "clientId": client_id,
            "submissionId": submission_id,
            "fvsIdeaId": idea_id,
            "provider": script_data["provider"],
            "text": script_text,
            "createdAt": script_data["createdAt"]
        }
        await scripts_db.insert_one(script)
        if "_id" in script:
            del script["_id"]
        
        # =================================================================
        # STEP 7: Create Audio Asset (ElevenLabs - REAL)
        # =================================================================
        audio_asset = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "submissionId": submission_id,
            "name": f"FVS Audio - {title[:40]}",
            "type": "Audio",
            "url": audio_result.url,
            "status": "Final",
            "provider": audio_result.provider,
            "fvsGenerated": True,
            "isMocked": audio_result.is_mocked,
            "durationSeconds": audio_result.duration_seconds,
            "createdAt": now,
            "updatedAt": now
        }
        await assets_db.insert_one(audio_asset)
        if "_id" in audio_asset:
            del audio_asset["_id"]
        
        # =================================================================
        # STEP 8: Create Video Task (MOCKED - video providers P2)
        # =================================================================
        # TODO: P2 - Integrate real video providers (Runway, Veo, etc.)
        video_prompt = f"Create a {idea.get('format', 'short')}-form video for: {title}"
        provider_job_id = f"fvs-kling-{uuid.uuid4()}"
        
        video_task = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "provider": "kling",
            "providerJobId": provider_job_id,
            "prompt": video_prompt,
            "mode": "audio",
            "scriptText": script_text[:1000],
            "audioAssetId": audio_asset["id"],
            "sourceAssetId": None,
            "aspectRatio": "9:16" if idea.get("format") == "short" else "16:9",
            "outputProfile": "shorts" if idea.get("format") == "short" else "youtube_long",
            "submissionId": submission_id,
            "status": "READY",
            "videoUrl": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "fvsGenerated": True,
            "isMocked": True,  # Video is still mocked
            "createdAt": now,
            "updatedAt": now
        }
        await video_tasks_db.insert_one(video_task)
        if "_id" in video_task:
            del video_task["_id"]
        
        # =================================================================
        # STEP 9: Create Video Asset (from mocked video task)
        # =================================================================
        video_asset = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "submissionId": submission_id,
            "name": f"FVS Video - {title[:40]}",
            "type": "Video",
            "url": video_task["videoUrl"],
            "status": "Draft",
            "provider": "kling",
            "sourceVideoTaskId": video_task["id"],
            "fvsGenerated": True,
            "isMocked": True,
            "createdAt": now,
            "updatedAt": now
        }
        await assets_db.insert_one(video_asset)
        if "_id" in video_asset:
            del video_asset["_id"]
        
        # =================================================================
        # STEP 10: Create Thumbnail Asset (OpenAI - REAL)
        # =================================================================
        thumbnail_asset = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "submissionId": submission_id,
            "name": f"FVS Thumbnail - {title[:40]}",
            "type": "Thumbnail",
            "url": thumbnail_result.url,
            "status": "Draft",
            "provider": thumbnail_result.provider,
            "fvsGenerated": True,
            "isMocked": thumbnail_result.is_mocked,
            "thumbnailPrompt": thumbnail_result.prompt_used,
            "createdAt": now,
            "updatedAt": now
        }
        await assets_db.insert_one(thumbnail_asset)
        if "_id" in thumbnail_asset:
            del thumbnail_asset["_id"]
        
        # =================================================================
        # STEP 11: Finalize - Update idea and submission status
        # =================================================================
        await ideas_db.update_one(
            {"id": idea_id},
            {"$set": {"status": "completed", "submissionId": submission_id, "updatedAt": now}}
        )
        
        await submissions_db.update_one(
            {"id": submission_id},
            {"$set": {"status": "SCHEDULED", "updatedAt": now}}
        )
        submission["status"] = "SCHEDULED"
        
        # Log FVS activity
        activity = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "action": "produce_episode",
            "description": f"FVS produced episode '{title}' with script, audio, video, and thumbnail",
            "metadata": {
                "ideaId": idea_id,
                "submissionId": submission_id,
                "videoTaskId": video_task["id"],
                "audioProvider": audio_result.provider,
                "thumbnailProvider": thumbnail_result.provider,
                "audioMocked": audio_result.is_mocked,
                "thumbnailMocked": thumbnail_result.is_mocked
            },
            "createdAt": now
        }
        await activity_db.insert_one(activity)
        
        idea["status"] = "completed"
        idea["submissionId"] = submission_id
        
        logger.info(f"FVS produced episode '{title}' for client {client_id}")
        logger.info(f"  - Audio: {audio_result.provider} (mocked={audio_result.is_mocked})")
        logger.info(f"  - Thumbnail: {thumbnail_result.provider} (mocked={thumbnail_result.is_mocked})")
        
        # Build response (backwards compatible structure)
        response = {
            "success": True,
            "submission": submission,
            "script": script,
            "audioAsset": audio_asset,
            "videoTask": video_task,
            "videoAsset": video_asset,
            "thumbnailAsset": thumbnail_asset,
            "idea": idea
        }
        
        # Add warnings if any occurred
        if warnings:
            response["warnings"] = warnings
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"FVS produce-episode error: {e}")
        await ideas_db.update_one(
            {"id": idea_id},
            {"$set": {"status": "proposed", "updatedAt": now}}
        )
        raise HTTPException(status_code=500, detail=f"Failed to produce episode: {str(e)}")


async def get_ideas(client_id: str, status: Optional[str] = None) -> list:
    """Get FVS ideas for a client."""
    db = fvs_ideas_collection()
    query = {"clientId": client_id} if client_id else {}
    
    if status:
        statuses = status.split(",")
        query["status"] = {"$in": statuses}
    
    ideas = await db.find(query, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return ideas


async def update_idea_status(client_id: str, idea_id: str, status: str) -> dict:
    """Update the status of an FVS idea."""
    db = fvs_ideas_collection()
    query = {"id": idea_id}
    if client_id:
        query["clientId"] = client_id
    
    valid_statuses = ["proposed", "approved", "rejected", "in_progress", "completed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    now = datetime.now(timezone.utc).isoformat()
    result = await db.update_one(query, {"$set": {"status": status, "updatedAt": now}})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    updated = await db.find_one(query, {"_id": 0})
    return updated


async def get_brain_snapshot(client_id: str) -> Optional[dict]:
    """Get the latest FVS brain snapshot for a client."""
    if not client_id:
        return None
    
    db = fvs_brain_snapshots_collection()
    snapshot = await db.find_one(
        {"clientId": client_id},
        {"_id": 0}
    )
    
    if not snapshot:
        snapshots = await db.find(
            {"clientId": client_id},
            {"_id": 0}
        ).sort("createdAt", -1).limit(1).to_list(1)
        snapshot = snapshots[0] if snapshots else None
    
    return snapshot


async def get_activity(client_id: str) -> list:
    """Get recent FVS activity for a client."""
    db = fvs_activity_collection()
    query = {"clientId": client_id} if client_id else {}
    
    activities = await db.find(query, {"_id": 0}).sort("createdAt", -1).to_list(50)
    return activities


async def get_config(client_id: str) -> dict:
    """Get FVS configuration for a client."""
    if not client_id:
        return {"automationLevel": "manual"}
    
    db = fvs_config_collection()
    config = await db.find_one({"clientId": client_id}, {"_id": 0})
    if not config:
        return {"automationLevel": "manual", "clientId": client_id}
    return config


async def update_config(client_id: str, automation_level: str) -> dict:
    """Update FVS configuration for a client."""
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required")
    
    valid_levels = ["manual", "semi_auto", "full_auto_short"]
    if automation_level not in valid_levels:
        raise HTTPException(status_code=400, detail=f"Invalid automation level. Must be one of: {valid_levels}")
    
    db = fvs_config_collection()
    now = datetime.now(timezone.utc).isoformat()
    
    await db.update_one(
        {"clientId": client_id},
        {"$set": {"automationLevel": automation_level, "updatedAt": now}, "$setOnInsert": {"createdAt": now}},
        upsert=True
    )
    
    config = await db.find_one({"clientId": client_id}, {"_id": 0})
    return config


async def get_scripts(client_id: str, submission_id: Optional[str] = None) -> list:
    """Get FVS-generated scripts for a client."""
    db = fvs_scripts_collection()
    query = {"clientId": client_id} if client_id else {}
    
    if submission_id:
        query["submissionId"] = submission_id
    
    scripts = await db.find(query, {"_id": 0}).sort("createdAt", -1).to_list(50)
    return scripts
