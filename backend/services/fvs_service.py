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


def generate_mock_ideas(target_format: str, channel_profile: dict = None) -> list:
    """Generate mock ideas when LLM is unavailable. Uses channel profile if available."""
    language = channel_profile.get("languageStyle", "english") if channel_profile else "english"
    pillars = channel_profile.get("contentPillars", []) if channel_profile else []

    # Channel-aware mock ideas based on content pillars
    if pillars or language in ("hinglish", "hindi"):
        # Use pillar-inspired topics in the channel's language style
        pillar_ideas = {
            "Wealth Building": [
                {"topic": "Chanakya ka Dhan Sutra jo aaj bhi kaam karta hai", "hypothesis": "Wealth-related Chanakya Niti consistently drives views among 25-44 male audience", "source": "youtube_analytics"},
                {"topic": "Paise bachane ke 3 Chanakya rules jo koi nahi batata", "hypothesis": "Money saving tips framed through ancient wisdom have high search volume", "source": "search_trends"},
            ],
            "Enemy Strategy": [
                {"topic": "Dushman ko kaise pehchane - Chanakya ke 5 signals", "hypothesis": "Enemy detection content has high watch time and completion rates", "source": "competitor_analysis"},
                {"topic": "Office politics mein Chanakya Niti kaise use karein", "hypothesis": "Workplace strategy content resonates with urban professionals", "source": "reddit"},
            ],
            "Mind Control": [
                {"topic": "Apne mann ko control karo - Chanakya ka secret formula", "hypothesis": "Self-discipline content in Hinglish is trending among young professionals", "source": "search_trends"},
                {"topic": "Focus kaise badhaye - 3 Chanakya techniques", "hypothesis": "Productivity framed as ancient wisdom performs well in Shorts format", "source": "audience_feedback"},
            ],
            "Success Formula": [
                {"topic": "Safalta ka shortcut - Chanakya ne kya kaha", "hypothesis": "Success formula content has strong engagement in Hinglish Shorts", "source": "youtube_analytics"},
                {"topic": "Haar ko jeet mein badlo - Chanakya strategy", "hypothesis": "Motivational content with strategic framing drives shares", "source": "competitor_analysis"},
            ],
        }
        ideas = []
        for pillar in pillars:
            if pillar in pillar_ideas:
                ideas.extend(pillar_ideas[pillar])
        # Fill remaining slots with general channel-themed ideas
        if len(ideas) < 5:
            general = [
                {"topic": "Chanakya ki sabse powerful sikh jo zindagi badal de", "hypothesis": "Broad Chanakya wisdom content consistently performs well", "source": "original"},
                {"topic": "Ye galti mat karna - Chanakya ki warning", "hypothesis": "Warning/mistake format drives curiosity clicks", "source": "youtube_analytics"},
                {"topic": "3 log jinse door raho - Chanakya Niti", "hypothesis": "People-avoidance listicles have high save and share rates", "source": "search_trends"},
            ]
            ideas.extend(general)
        mock = [{"topic": i["topic"], "hypothesis": i["hypothesis"], "source": i["source"], "format": target_format, "convictionScore": round(random.uniform(0.65, 0.90), 2)} for i in ideas[:5]]
        return mock

    # Generic fallback for channels without profile
    mock_ideas = [
        {"topic": "5 Content Mistakes That Kill Audience Retention", "hypothesis": "Editing tips consistently perform well, and this angle addresses a pain point", "source": "youtube_analytics", "format": target_format, "convictionScore": 0.85},
        {"topic": "I Tried AI Tools for Content Creation - Here's What Happened", "hypothesis": "AI content is trending, and personal experiments drive engagement", "source": "search_trends", "format": target_format, "convictionScore": 0.78},
        {"topic": "The Budget Setup That Sounds Professional", "hypothesis": "Budget content resonates with beginners, high search volume", "source": "reddit", "format": target_format, "convictionScore": 0.72},
        {"topic": "How Top Creators Repurpose One Episode Into 10 Pieces of Content", "hypothesis": "Content multiplication is a hot topic in creator communities", "source": "competitor_analysis", "format": target_format, "convictionScore": 0.80},
        {"topic": "Behind the Scenes: How We Produce Content in 2 Hours", "hypothesis": "Audience requested more process content, builds trust", "source": "audience_feedback", "format": target_format, "convictionScore": 0.68},
    ]
    return mock_ideas[:5]


async def generate_ideas_with_llm(client_id: str, analytics_data: dict, brand_voice: str, target_format: str, channel_profile: dict = None, trending_topics: list = None) -> list:
    """Use LLM to generate FVS ideas based on channel profile, real trends, and analytics."""
    from services.ai_service import call_gemini

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        return generate_mock_ideas(target_format, channel_profile)

    top_topics = analytics_data.get("topTopics", [])
    recent_performance = analytics_data.get("performance", "moderate growth")

    # Use real trending topics from Trend Radar if available, otherwise use channel pillars as signals
    if trending_topics:
        signals_text = "\n".join([
            f"- [{t.get('keyword', '')}] {t.get('title', 'N/A')[:60]} by {t.get('channelName', 'Unknown')} ({t.get('viewCount', 0):,} views)"
            for t in trending_topics
        ])
    elif content_pillars:
        # Generate pillar-based signals instead of generic off-topic ones
        signals_text = "\n".join([f"- audience_feedback: '{pillar}' (trending in niche)" for pillar in content_pillars])
    else:
        external_signals = random.sample(SIMULATED_EXTERNAL_SIGNALS, min(4, len(SIMULATED_EXTERNAL_SIGNALS)))
        signals_text = "\n".join([f"- {s['source']}: '{s['topic']}' ({s['trend']})" for s in external_signals])

    # Build channel-aware context from profile
    language_style = channel_profile.get("languageStyle", "english") if channel_profile else "english"
    content_pillars = channel_profile.get("contentPillars", []) if channel_profile else []
    brand_desc = channel_profile.get("brandDescription", "") if channel_profile else ""
    tone = channel_profile.get("tone", brand_voice or "Professional and engaging") if channel_profile else (brand_voice or "Professional and engaging")

    pillars_text = ", ".join(content_pillars) if content_pillars else "general content"

    # Language-specific instructions
    language_instructions = {
        "english": "Generate ideas in English.",
        "hinglish": "Generate ideas in Hinglish (Hindi words written in Latin/Roman script mixed with English). Titles should be punchy, using Hindi expressions Indian audiences naturally use.",
        "hindi": "Generate ideas in Hindi (Devanagari script).",
        "spanish": "Generate ideas in Spanish.",
    }
    lang_instruction = language_instructions.get(language_style, "Generate ideas in English.")

    prompt = f"""You are FVS Brain, an AI content strategist. Generate 5 episode ideas that are STRICTLY about this channel's core subject matter.

CHANNEL PROFILE:
- Description: {brand_desc or tone}
- Tone: {tone}
- Content Pillars: {pillars_text}
- Language Style: {language_style}
- Target format: {target_format} ({"40-90 second vertical Shorts" if target_format == "short" else "15-45 minute full episodes"})

CRITICAL CONSTRAINT: Every single idea MUST be directly about the channel's content pillars ({pillars_text}). Do NOT suggest ideas about AI, generic content creation tips, monetization, tech tools, or any topic outside the channel's pillars. If the channel is about Chanakya Niti, every idea must be about Chanakya principles. If the channel is about cooking, every idea must be about cooking. Stay 100% on-niche.

LANGUAGE INSTRUCTIONS:
{lang_instruction}

TOP PERFORMING PAST CONTENT:
{', '.join(top_topics) if top_topics else 'No past content yet'}

RECENT PERFORMANCE:
{recent_performance}

TRENDING SIGNALS (use ONLY signals relevant to this channel's niche, ignore off-topic signals):
{signals_text}

Generate exactly 5 episode ideas that:
1. Are DIRECTLY about the channel's content pillars ({pillars_text}) — no off-topic ideas
2. Use the channel's language style ({language_style}) for titles
3. Incorporate trending angles only if they relate to the channel's niche
4. Are specific and actionable (not generic)
5. Would make sense on this specific channel and nowhere else

For each idea, provide:
1. topic: A specific, actionable topic title (in {language_style}) — must be on-niche
2. hypothesis: Why this will resonate with the audience (1-2 sentences)
3. source: Which signal inspired this (youtube_analytics, reddit, search_trends, competitor_analysis, audience_feedback, or original)
4. format: "{target_format}"
5. convictionScore: 0.0-1.0 based on how confident you are

Return ONLY valid JSON array, no markdown:
[{{"topic": "...", "hypothesis": "...", "source": "...", "format": "...", "convictionScore": 0.0}}]"""

    try:
        response = await call_gemini(
            prompt,
            max_tokens=4096,
            system_message=f"You are a strategic content advisor specializing EXCLUSIVELY in {pillars_text}. Every idea you generate must be directly about these topics. Never suggest off-topic ideas about AI, tech, generic tips, or anything outside the channel's niche. Always respond with valid JSON only."
        )

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
        return generate_mock_ideas(target_format, channel_profile)


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

        # Load Channel Profile (Brand Brain) for niche, language, and content pillars
        from services.channel_profile_service import get_channel_profile
        channel_profile = await get_channel_profile(client_id)
        logger.info(f"FVS propose_ideas: channel language={channel_profile.get('languageStyle')}, pillars={channel_profile.get('contentPillars')}")

        # Query real trending topics from Trend Radar database
        from db.mongo import get_db
        database = get_db()
        trending_topics = await database.trending_topics.find(
            {"clientId": client_id},
            {"_id": 0, "keyword": 1, "title": 1, "viewCount": 1, "channelName": 1}
        ).sort("viewCount", -1).limit(10).to_list(10)

        submissions_db = submissions_collection()
        recent_subs = await submissions_db.find(
            {"clientId": client_id, "status": {"$in": ["PUBLISHED", "SCHEDULED"]}},
            {"_id": 0, "title": 1, "contentType": 1}
        ).sort("createdAt", -1).to_list(10)

        top_topics = [s["title"] for s in recent_subs[:5]] if recent_subs else []

        analytics_context = {
            "topTopics": top_topics,
            "performance": f"{total_downloads} downloads, {total_views} views, {episodes_published} episodes in {range_days} days"
        }

        raw_ideas = await generate_ideas_with_llm(client_id, analytics_context, brand_voice, format, channel_profile, trending_topics)
        
        language_style = channel_profile.get("languageStyle", "english")
        pillar_tags = [f"#{p.replace(' ', '').lower()}" for p in channel_profile.get("contentPillars", [])]

        ideas = []
        for idea_data in raw_ideas:
            topic = idea_data.get("topic", "Untitled Idea")

            # Generate hooks and captions based on channel language
            if language_style in ("hinglish", "hindi"):
                hooks = [
                    f"Kya aap bhi yeh galti kar rahe ho? {topic} ke baare mein suno!",
                    f"Maine {topic} try kiya aur yeh hua...",
                    f"3 secrets about {topic} jo koi nahi batata!"
                ]
                caption = f"🔥 {topic} - ek dum fresh perspective! Like & share if you agree 🙌"
                hashtags = ["#shorts", "#viral", "#trending", *pillar_tags[:3], f"#{topic.split()[0].lower() if topic else 'content'}"]
            else:
                hooks = [
                    f"Are you making this mistake? Listen up about {topic}!",
                    f"I tried {topic} and this is what happened...",
                    f"3 secrets about {topic} nobody tells you!"
                ]
                caption = f"🔥 {topic} - a fresh perspective! Like & share if you agree 🙌"
                hashtags = ["#shorts", "#viral", "#trending", *pillar_tags[:3], f"#{topic.split()[0].lower() if topic else 'content'}"]
            
            idea = {
                "id": str(uuid.uuid4()),
                "clientId": client_id,
                "topic": topic,
                "hypothesis": idea_data.get("hypothesis", ""),
                "source": idea_data.get("source", "original"),
                "format": idea_data.get("format", format),
                "convictionScore": min(1.0, max(0.0, float(idea_data.get("convictionScore", 0.5)))),
                "status": "proposed",
                "hooks": hooks,
                "script": None,  # Will be generated on demand via generate-script endpoint
                "caption": caption,
                "hashtags": hashtags,
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
        
        pillars_str = ", ".join(channel_profile.get("contentPillars", [])) or "general content"
        patterns = [
            f"Format '{format}' episodes recommended based on channel pillars: {pillars_str}",
            f"Top performing topics: {', '.join(top_topics[:3]) if top_topics else 'No past content yet'}",
            f"Trend Radar signals: {len(trending_topics)} trending topics incorporated" if trending_topics else "No trending data available — using simulated signals",
            f"Audience engagement is {('strong' if total_views > 5000 else 'growing')}"
        ]

        snapshot = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "timeWindow": range,
            "summary": f"Analyzed {range_days} days of data. Generated {len(ideas)} {format}-format episode ideas in {language_style} style based on {total_downloads} downloads and {total_views} views. Focus: {pillars_str}.",
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
        
        # Create notification for new FVS ideas
        try:
            from routers.notifications import create_notification
            from models.notification import NotificationType, NotificationPriority
            from db.mongo import users_collection
            
            # Find the user associated with this client to send notification
            users_db = users_collection()
            client_user = await users_db.find_one({"clientId": client_id}, {"_id": 0, "id": 1})
            
            if client_user:
                await create_notification(
                    user_id=client_user["id"],
                    notification_type=NotificationType.FVS_IDEA,
                    title=f"FVS Brain: {len(ideas)} new ideas",
                    message=f"The FVS Brain analyzed your content and proposed {len(ideas)} new {format}-format episode ideas.",
                    link="/dashboard/system",
                    priority=NotificationPriority.MEDIUM
                )
        except Exception as e:
            logger.warning(f"Failed to create FVS idea notification: {e}")
        
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

async def generate_script_for_idea(idea: dict, brand_voice: str, channel_profile: dict = None) -> dict:
    """
    Step 1: Generate script from idea using LLM.
    
    Uses Channel Profile settings for language style, tone, and brand context.
    
    Args:
        idea: The FVS idea dict
        brand_voice: Client's brand voice description (legacy, now in profile)
        channel_profile: Channel Profile dict with languageStyle, tone, etc.
        
    Returns:
        Script dict with id, text, provider, etc.
    """
    from services.ai_service import call_gemini
    from services.channel_profile_service import get_script_instructions

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    now = datetime.now(timezone.utc).isoformat()

    script_text = ""
    provider = "mock"

    # Get script instructions from channel profile
    if channel_profile:
        script_instructions = get_script_instructions(channel_profile)
    else:
        script_instructions = "Write in clear, conversational English."

    try:
        if api_key:
            format_desc = "60-90 second vertical video script" if idea.get('format') == 'short' else "15-30 minute podcast episode"

            script_prompt = f"""Write a {idea.get('format', 'short')}-form script for this episode:

Topic: {idea.get('topic')}
Hypothesis/Angle: {idea.get('hypothesis')}
Format: {format_desc}

{script_instructions}

Write an engaging script that:
- Opens with a strong hook that grabs attention in the first 3 seconds
- Delivers clear value with punchy, memorable lines
- Has a memorable closing/CTA

Write the full script text only. No stage directions or timestamps unless performance cues are specified above."""

            script_text = await call_gemini(
                script_prompt,
                max_tokens=4096,
                system_message="You are an expert scriptwriter. Follow the language and style instructions exactly."
            )
            provider = "gemini"
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
        "languageStyle": channel_profile.get("languageStyle", "english") if channel_profile else "english",
        "createdAt": now
    }


async def generate_metadata_for_episode(idea: dict, script_text: str) -> dict:
    """
    Step 2: Generate YouTube metadata (title, description, tags) using LLM.
    """
    from services.ai_service import call_gemini

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")

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

            metadata_response = await call_gemini(
                metadata_prompt,
                max_tokens=2048,
                system_message="You are a YouTube SEO expert."
            )

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


async def _rollback_pipeline_steps(client_id: str, completed_steps: list) -> None:
    """
    Saga rollback: delete any MongoDB documents created by produce_episode steps
    so a failed Full Auto run leaves no orphaned data.

    completed_steps is a list of (step_name, document_id) tuples in order.
    We delete in reverse order.
    """
    submissions_db = submissions_collection()
    scripts_db = fvs_scripts_collection()
    assets_db = assets_collection()
    video_tasks_db = video_tasks_collection()

    for step_name, doc_id in reversed(completed_steps):
        try:
            if step_name == "submission":
                await submissions_db.delete_one({"id": doc_id, "clientId": client_id})
            elif step_name == "script":
                await scripts_db.delete_one({"id": doc_id, "clientId": client_id})
            elif step_name == "audio_asset":
                await assets_db.delete_one({"id": doc_id, "clientId": client_id})
            elif step_name == "video_task":
                await video_tasks_db.delete_one({"id": doc_id, "clientId": client_id})
            elif step_name in ("video_asset", "thumbnail_asset"):
                await assets_db.delete_one({"id": doc_id, "clientId": client_id})
            logger.info(f"FVS rollback: deleted {step_name} {doc_id}")
        except Exception as rollback_err:
            logger.error(f"FVS rollback failed for {step_name} {doc_id}: {rollback_err}")


async def produce_episode(client_id: str, idea_id: str, mode: str) -> dict:
    """
    FVS Orchestrator: Produce a full episode from an approved idea.
    
    Uses Channel Profile for:
    - Script language style (English, Hinglish, etc.)
    - Thumbnail style and template
    - Number of thumbnail options to generate
    
    Pipeline Steps:
    1. Load Channel Profile (Brand Brain)
    2. Generate script using LLM with profile settings
    3. Generate YouTube metadata using LLM
    4. Generate audio using ElevenLabs (REAL)
    5. Generate N thumbnails using OpenAI GPT-Image-1 (based on profile)
    6. Create video task (MOCKED - P2)
    7. Create Submission and Assets
    
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
    
    completed_steps: list = []  # Saga: tracks created documents for rollback on failure

    try:
        # =================================================================
        # STEP 0: Load Channel Profile (Brand Brain)
        # =================================================================
        from services.channel_profile_service import get_channel_profile, get_thumbnail_prompt
        
        channel_profile = await get_channel_profile(client_id)
        thumbnails_to_generate = channel_profile.get("thumbnailsPerShort", 1)
        logger.info(f"FVS using Channel Profile: language={channel_profile.get('languageStyle')}, thumbnails={thumbnails_to_generate}")
        
        # Fetch idea
        idea = await ideas_db.find_one({"id": idea_id, "clientId": client_id}, {"_id": 0})
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")
        
        await ideas_db.update_one(
            {"id": idea_id},
            {"$set": {"status": "in_progress", "updatedAt": now}}
        )
        
        # Get client settings (legacy, for backwards compat)
        settings = await settings_db.find_one({"clientId": client_id}, {"_id": 0})
        brand_voice = settings.get("brandVoiceDescription", "Professional and engaging") if settings else "Professional and engaging"
        
        # =================================================================
        # STEP 1: Generate Script with Channel Profile
        # =================================================================
        logger.info(f"FVS Step 1: Generating script for idea '{idea.get('topic')}' in {channel_profile.get('languageStyle')} style")
        script_data = await generate_script_for_idea(idea, brand_voice, channel_profile)
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
        # STEP 4: Generate Multiple Thumbnails (OpenAI - REAL)
        # =================================================================
        logger.info(f"FVS Step 4: Generating {thumbnails_to_generate} thumbnail(s) via OpenAI")
        
        # Variation hints for generating different thumbnail options
        variation_hints = [
            "",  # First one uses base prompt
            "alternative composition, different text arrangement",
            "emphasize the key concept visually, minimal text",
            "bold dramatic style, maximum contrast",
        ]
        
        thumbnail_results: List[ThumbnailGenerationResult] = []
        for i in range(thumbnails_to_generate):
            variation_hint = variation_hints[i % len(variation_hints)]
            
            # Build prompt using channel profile
            custom_prompt = get_thumbnail_prompt(
                channel_profile,
                topic=idea.get("topic", ""),
                title=title,
                variation_hint=variation_hint
            )
            
            thumbnail_result = await generate_thumbnail(
                topic=idea.get("topic", ""),
                brand_voice=brand_voice,
                title=title,
                format=idea.get("format", "short"),
                provider="openai",
                custom_prompt=custom_prompt
            )
            thumbnail_results.append(thumbnail_result)
            
            if thumbnail_result.warning:
                warnings.append(f"Thumbnail {i+1}: {thumbnail_result.warning}")
        
        # Use first thumbnail as primary
        primary_thumbnail = thumbnail_results[0]
        if primary_thumbnail.warning:
            logger.warning(f"Primary thumbnail warning: {primary_thumbnail.warning}")
        
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
            "languageStyle": channel_profile.get("languageStyle", "english"),
            "primaryThumbnailAssetId": None,  # Will be set after thumbnail assets created
            "createdAt": now,
            "updatedAt": now
        }
        await submissions_db.insert_one(submission)
        submission_id = submission["id"]
        completed_steps.append(("submission", submission_id))
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
            "languageStyle": script_data.get("languageStyle", "english"),
            "createdAt": script_data["createdAt"]
        }
        await scripts_db.insert_one(script)
        completed_steps.append(("script", script["id"]))
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
        completed_steps.append(("audio_asset", audio_asset["id"]))
        if "_id" in audio_asset:
            del audio_asset["_id"]
        
        # =================================================================
        # STEP 8: Create Video Task (MOCKED - video providers P2)
        # =================================================================
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
            "isMocked": True,
            "createdAt": now,
            "updatedAt": now
        }
        await video_tasks_db.insert_one(video_task)
        completed_steps.append(("video_task", video_task["id"]))
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
        completed_steps.append(("video_asset", video_asset["id"]))
        if "_id" in video_asset:
            del video_asset["_id"]
        
        # =================================================================
        # STEP 10: Create Thumbnail Assets (OpenAI - REAL, multiple options)
        # =================================================================
        thumbnail_assets = []
        for i, thumb_result in enumerate(thumbnail_results):
            thumb_num = i + 1
            is_primary = (i == 0)
            
            thumbnail_asset = {
                "id": str(uuid.uuid4()),
                "clientId": client_id,
                "submissionId": submission_id,
                "name": f"FVS Thumbnail {thumb_num}/{len(thumbnail_results)} - {title[:30]}",
                "type": "Thumbnail",
                "url": thumb_result.url,
                "status": "Draft",
                "provider": thumb_result.provider,
                "fvsGenerated": True,
                "isMocked": thumb_result.is_mocked,
                "thumbnailPrompt": thumb_result.prompt_used,
                "thumbnailIndex": thumb_num,
                "thumbnailTotal": len(thumbnail_results),
                "isPrimaryThumbnail": is_primary,
                "createdAt": now,
                "updatedAt": now
            }
            await assets_db.insert_one(thumbnail_asset)
            completed_steps.append(("thumbnail_asset", thumbnail_asset["id"]))
            if "_id" in thumbnail_asset:
                del thumbnail_asset["_id"]
            thumbnail_assets.append(thumbnail_asset)
        
        # Set primary thumbnail on submission
        primary_thumb_id = thumbnail_assets[0]["id"] if thumbnail_assets else None
        if primary_thumb_id:
            await submissions_db.update_one(
                {"id": submission_id},
                {"$set": {"primaryThumbnailAssetId": primary_thumb_id}}
            )
            submission["primaryThumbnailAssetId"] = primary_thumb_id
        
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
            "description": f"FVS produced episode '{title}' with script ({channel_profile.get('languageStyle')}), audio, video, and {len(thumbnail_assets)} thumbnail(s)",
            "metadata": {
                "ideaId": idea_id,
                "submissionId": submission_id,
                "videoTaskId": video_task["id"],
                "audioProvider": audio_result.provider,
                "thumbnailProvider": primary_thumbnail.provider,
                "audioMocked": audio_result.is_mocked,
                "thumbnailMocked": primary_thumbnail.is_mocked,
                "languageStyle": channel_profile.get("languageStyle"),
                "thumbnailCount": len(thumbnail_assets)
            },
            "createdAt": now
        }
        await activity_db.insert_one(activity)
        
        idea["status"] = "completed"
        idea["submissionId"] = submission_id
        
        logger.info(f"FVS produced episode '{title}' for client {client_id}")
        logger.info(f"  - Script: {channel_profile.get('languageStyle')} style")
        logger.info(f"  - Audio: {audio_result.provider} (mocked={audio_result.is_mocked})")
        logger.info(f"  - Thumbnails: {len(thumbnail_assets)} generated (mocked={primary_thumbnail.is_mocked})")
        
        # Build response (backwards compatible structure)
        response = {
            "success": True,
            "submission": submission,
            "script": script,
            "audioAsset": audio_asset,
            "videoTask": video_task,
            "videoAsset": video_asset,
            "thumbnailAsset": thumbnail_assets[0] if thumbnail_assets else None,  # Primary for backwards compat
            "thumbnailAssets": thumbnail_assets,  # All thumbnails for new UI
            "idea": idea,
            "channelProfile": {
                "languageStyle": channel_profile.get("languageStyle"),
                "thumbnailStyle": channel_profile.get("thumbnailStyle"),
                "thumbnailsGenerated": len(thumbnail_assets)
            }
        }
        
        if warnings:
            response["warnings"] = warnings
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        # Map completed step count to human-readable stage name
        step_names = {
            0: "Script generation",
            1: "Script generation",
            2: "Metadata generation",
            3: "Audio generation (ElevenLabs)",
            4: "Video task creation",
            5: "Video asset creation",
            6: "Thumbnail generation (OpenAI)",
        }
        failed_step = step_names.get(len(completed_steps), f"Step {len(completed_steps) + 1}")
        error_msg = str(e)
        # Add hints for common issues
        if "GEMINI_API_KEY" in error_msg or "genai" in error_msg.lower():
            error_msg = f"{failed_step} failed: Gemini API key not configured or invalid. Check GEMINI_API_KEY in environment."
        elif "ELEVENLABS" in error_msg or "elevenlabs" in error_msg.lower():
            error_msg = f"{failed_step} failed: ElevenLabs API error. Check ELEVENLABS_API_KEY."
        elif "OPENAI" in error_msg or "openai" in error_msg.lower() or "dall" in error_msg.lower():
            error_msg = f"{failed_step} failed: OpenAI API error. Check OPENAI_API_KEY."
        else:
            error_msg = f"{failed_step} failed: {error_msg}"

        logger.error(f"FVS produce-episode error — {error_msg}", exc_info=True)
        # Saga rollback: clean up any documents created before the failure
        if completed_steps:
            logger.info(f"FVS rollback: removing {len(completed_steps)} created document(s)")
            await _rollback_pipeline_steps(client_id, completed_steps)
        # Reset idea status so user can retry
        await ideas_db.update_one(
            {"id": idea_id},
            {"$set": {"status": "proposed", "updatedAt": now}}
        )
        raise HTTPException(status_code=500, detail=error_msg)


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


async def get_idea_by_id(client_id: str, idea_id: str) -> dict:
    """
    Get a single FVS idea by ID.
    
    Used for the Strategy Idea Detail view.
    
    Args:
        client_id: The client ID
        idea_id: The idea ID
        
    Returns:
        The idea dict or raises HTTPException if not found
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required")
    
    db = fvs_ideas_collection()
    idea = await db.find_one({"id": idea_id, "clientId": client_id}, {"_id": 0})
    
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    return idea


async def generate_script_for_idea_endpoint(client_id: str, idea_id: str) -> dict:
    """
    Generate a script for an FVS idea using Channel Profile settings.
    
    This is the endpoint version that fetches the idea and profile, then generates.
    Returns the script text along with metadata for the UI.
    
    Args:
        client_id: The client ID
        idea_id: The idea ID
        
    Returns:
        Dict with scriptText, title, hooks, languageStyle, etc.
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required")
    
    # Fetch idea
    db = fvs_ideas_collection()
    idea = await db.find_one({"id": idea_id, "clientId": client_id}, {"_id": 0})
    
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Get channel profile
    from services.channel_profile_service import get_channel_profile
    channel_profile = await get_channel_profile(client_id)
    
    # Get brand voice from legacy settings (fallback)
    settings_db = client_settings_collection()
    settings = await settings_db.find_one({"clientId": client_id}, {"_id": 0})
    brand_voice = settings.get("brandVoiceDescription", "") if settings else ""
    
    # Generate script using channel profile
    logger.info(f"Generating script for idea '{idea.get('topic')}' using {channel_profile.get('languageStyle')} style")
    script_data = await generate_script_for_idea(idea, brand_voice, channel_profile)
    
    # Generate a title suggestion
    title = idea.get("topic", "Untitled")
    
    script_text = script_data.get("text", "")
    
    # Use the pre-generated hooks from the idea, not the script lines
    # The hooks field was already set during propose_ideas with catchy opening lines
    hooks = idea.get("hooks", [])
    
    # Save script back to the idea document for persistence
    now = datetime.now(timezone.utc).isoformat()
    await db.update_one(
        {"id": idea_id, "clientId": client_id},
        {"$set": {
            "script": script_text,
            "updatedAt": now
        }}
    )
    
    return {
        "scriptText": script_text,
        "title": title,
        "hooks": hooks,
        "languageStyle": script_data.get("languageStyle", "english"),
        "provider": script_data.get("provider", "mock"),
        "ideaId": idea_id,
        "topic": idea.get("topic"),
        "hypothesis": idea.get("hypothesis"),
        "format": idea.get("format", "short"),
        "caption": idea.get("caption"),
        "hashtags": idea.get("hashtags")
    }


async def refine_script(client_id: str, script_id: str, instruction: str) -> dict:
    """
    Refine an existing FVS script using an AI instruction.
    E.g. "Make it funnier", "Shorten to 45 seconds", "Rewrite the hook".
    Saves the refined version and returns the new script text.
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required")

    from services.ai_service import call_gemini
    from db.mongo import fvs_scripts_collection

    scripts_db = fvs_scripts_collection()
    script_doc = await scripts_db.find_one({"id": script_id, "clientId": client_id}, {"_id": 0})
    if not script_doc:
        raise HTTPException(status_code=404, detail="Script not found")

    original_text = script_doc.get("scriptText") or script_doc.get("text", "")
    if not original_text:
        raise HTTPException(status_code=400, detail="Script has no text to refine")

    prompt = f"""You are an expert scriptwriter. Refine the following script according to the instruction.

INSTRUCTION: {instruction}

ORIGINAL SCRIPT:
{original_text}

STRICT RULES:
- Return ONLY the refined script text, no explanations or meta-commentary
- Keep the same language style (Hinglish if original is Hinglish, English if English)
- Preserve the core message and topic
- Do NOT add section headers, labels, or stage directions

Refined script:"""

    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI service not available — GEMINI_API_KEY not configured")

    try:
        refined_text = await call_gemini(prompt, max_tokens=2048)
    except Exception as e:
        logger.error(f"Script refinement LLM error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI refinement failed: {str(e)}")

    now = datetime.now(timezone.utc).isoformat()
    # Save refined version — push original to versions array and update current text
    await scripts_db.update_one(
        {"id": script_id},
        {
            "$set": {"scriptText": refined_text, "text": refined_text, "updatedAt": now, "lastInstruction": instruction},
            "$push": {"versions": {"scriptText": original_text, "instruction": instruction, "refinedAt": now}}
        }
    )

    return {
        "scriptId": script_id,
        "scriptText": refined_text,
        "instruction": instruction,
        "updatedAt": now,
    }
