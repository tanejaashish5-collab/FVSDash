"""
Content Templates — pre-built script frameworks for quick-start content creation.

System templates are seeded globally (clientId="system").
Users can also save their own custom templates.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional
import uuid

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import get_db

router = APIRouter(prefix="/templates", tags=["templates"])

# ──────────────────────────────────────────────────────────────────────────────
# Seed data — 15 proven script frameworks
# ──────────────────────────────────────────────────────────────────────────────
SYSTEM_TEMPLATES = [
    {
        "name": "AIDA Hook",
        "category": "hook",
        "format": "short",
        "description": "Attention → Interest → Desire → Action condensed for Shorts.",
        "scriptTemplate": "Did you know {{shocking_fact}}?\n\nMost people don't realize {{interesting_angle}}. But here's the thing — {{desire_point}}.\n\nBy the end of this video you'll know exactly how to {{action_benefit}}.\n\nLet's break it down.",
        "tags": ["marketing", "conversion", "hook"],
    },
    {
        "name": "Problem-Agitate-Solve",
        "category": "hook",
        "format": "short",
        "description": "Surface the pain point, twist the knife, then reveal the solution.",
        "scriptTemplate": "{{problem_statement}}.\n\nAnd the worst part? {{agitation_point}}. Most people keep doing {{common_mistake}} and wonder why nothing changes.\n\nHere's what actually works: {{solution}}.\n\nHere's the step-by-step.",
        "tags": ["persuasion", "problem-solving"],
    },
    {
        "name": "Stat-Shock Opener",
        "category": "hook",
        "format": "short",
        "description": "Open with a disruptive statistic that forces the viewer to stop scrolling.",
        "scriptTemplate": "{{shocking_statistic}}. That's not a typo.\n\n{{context_for_stat}}. And yet {{common_misconception}}.\n\nToday I'm going to show you why this matters for {{target_audience}} — and what you can do about it right now.",
        "tags": ["data-driven", "pattern-interrupt"],
    },
    {
        "name": "Question Hook",
        "category": "hook",
        "format": "short",
        "description": "Open with a provocative question the viewer can't ignore.",
        "scriptTemplate": "What if {{provocative_what_if}}?\n\nI asked myself this after {{personal_trigger_moment}}. The answer changed how I {{relevant_change}}.\n\nHere's exactly what I discovered — and how you can apply it today.",
        "tags": ["curiosity", "personal"],
    },
    {
        "name": "Listicle Short",
        "category": "full-script",
        "format": "short",
        "description": "Clean numbered list — great for tips, tools, or common mistakes.",
        "scriptTemplate": "{{count}} {{topic}} that {{audience}} needs to know.\n\nNumber {{count}}: {{point_1}}\n\nNumber {{count_minus_1}}: {{point_2}}\n\nNumber {{count_minus_2}}: {{point_3}}\n\nAnd the number one {{topic}}: {{top_point}}\n\nFollow for more {{content_theme}} every week.",
        "tags": ["list", "educational", "quick-tips"],
    },
    {
        "name": "Tutorial / How-To",
        "category": "full-script",
        "format": "short",
        "description": "Step-by-step walkthrough for a specific skill or task.",
        "scriptTemplate": "Here's exactly how to {{skill_or_task}} in under {{time_estimate}}.\n\nStep 1: {{step_1}}\n\nStep 2: {{step_2}}\n\nStep 3: {{step_3}}\n\nCommon mistake: {{common_mistake}}. Do {{correct_action}} instead.\n\nSave this for when you need it.",
        "tags": ["how-to", "educational", "step-by-step"],
    },
    {
        "name": "Talking Head",
        "category": "full-script",
        "format": "short",
        "description": "Direct-to-camera monologue with strong personal authority.",
        "scriptTemplate": "I've {{relevant_experience}} — here's the one thing I wish I knew sooner.\n\n{{core_insight}}.\n\nHere's why this matters: {{reason_1}} and {{reason_2}}.\n\nSo next time you {{relevant_scenario}}, try {{recommended_action}}.\n\nComment '{{keyword}}' if this helped — I read every one.",
        "tags": ["personal", "authority", "direct"],
    },
    {
        "name": "Story-First Arc",
        "category": "story-arc",
        "format": "short",
        "description": "Personal narrative that hooks via story before delivering the insight.",
        "scriptTemplate": "{{time_period}} ago, I {{opening_situation}}. I had no idea it would change everything.\n\n{{story_event}} happened. And in that moment I realized: {{key_realization}}.\n\nHere's what that taught me about {{topic}} — and how you can use it too.",
        "tags": ["storytelling", "emotional", "personal"],
    },
    {
        "name": "Challenge / Transformation",
        "category": "story-arc",
        "format": "short",
        "description": "Before-and-after framing with a challenge at the core.",
        "scriptTemplate": "I tried {{challenge_description}} for {{duration}}. Here's what happened.\n\nBefore: {{before_state}}.\n\nWeek 1: {{early_result}}.\n\nBy the end: {{final_transformation}}.\n\nThe biggest thing I learned: {{key_lesson}}.\n\nWould you try this? Drop a comment below.",
        "tags": ["challenge", "transformation", "engagement"],
    },
    {
        "name": "Behind the Scenes",
        "category": "story-arc",
        "format": "short",
        "description": "Pull-back-the-curtain authenticity that builds trust.",
        "scriptTemplate": "Here's what it actually looks like to {{process_or_role}}.\n\nMost people only see {{public_perception}}. But the reality is {{behind_scenes_truth}}.\n\nToday I'm showing you {{specific_bts_element}} — no filter, no script.\n\n{{honest_observation}}. If you're thinking about {{related_aspiration}}, watch this first.",
        "tags": ["authentic", "behind-the-scenes", "trust"],
    },
    {
        "name": "Day-in-the-Life",
        "category": "story-arc",
        "format": "short",
        "description": "Relatable time-based structure walking through a routine.",
        "scriptTemplate": "Here's what a typical {{day_type}} looks like when you {{role_or_lifestyle}}.\n\n{{time_1}}: {{morning_activity}}.\n\n{{time_2}}: {{midday_activity}}.\n\n{{time_3}}: {{evening_activity}}.\n\nThe thing nobody tells you: {{hidden_truth}}.\n\nFollow to see more of the real side of {{topic}}.",
        "tags": ["lifestyle", "routine", "relatable"],
    },
    {
        "name": "Podcast Episode Intro",
        "category": "full-script",
        "format": "podcast",
        "description": "Episode-opening that re-hooks returning listeners and welcomes new ones.",
        "scriptTemplate": "Welcome back to {{podcast_name}} — I'm your host {{host_name}}.\n\nToday we're talking about {{episode_topic}}, and I promise this episode will {{listener_benefit}}.\n\nMy guest is {{guest_name}} — {{guest_one_liner}}.\n\nLet's jump in.",
        "tags": ["podcast", "intro", "host"],
    },
    {
        "name": "Guest Introduction",
        "category": "full-script",
        "format": "podcast",
        "description": "Warm, credibility-building guest intro with a curiosity hook.",
        "scriptTemplate": "Joining me today is someone who {{guest_achievement}}.\n\nBut what really got me was when I read that {{surprising_fact_about_guest}}.\n\n{{guest_name}}, welcome to the show.\n\nBefore we dive in — can you tell the audience the one thing your bio doesn't capture?",
        "tags": ["podcast", "guest", "intro"],
    },
    {
        "name": "Strong CTA Outro",
        "category": "cta",
        "format": "short",
        "description": "Commanding call-to-action that converts viewers into subscribers.",
        "scriptTemplate": "If you got value from this, do me one favor — share this with someone who needs to hear it.\n\nAnd if you want {{content_promise}}, subscribe right now. I drop new content every {{frequency}}.\n\nSee you in the next one.",
        "tags": ["cta", "subscribe", "share"],
    },
    {
        "name": "Soft CTA Outro",
        "category": "cta",
        "format": "short",
        "description": "Low-pressure ask that respects the viewer while still driving engagement.",
        "scriptTemplate": "That's everything I've got on {{topic}} for now.\n\nIf one thing from this resonated, drop it in the comments — I'd love to know what stood out.\n\nAnd if you want more content like this, the subscribe button is right there. No pressure — just glad you watched.",
        "tags": ["cta", "soft-sell", "community"],
    },
]


async def ensure_system_templates():
    """Idempotent seed — only inserts missing system templates."""
    db = get_db()
    existing = await db.content_templates.count_documents({"clientId": "system"})
    if existing >= len(SYSTEM_TEMPLATES):
        return
    now = datetime.now(timezone.utc).isoformat()
    for t in SYSTEM_TEMPLATES:
        await db.content_templates.update_one(
            {"clientId": "system", "name": t["name"]},
            {"$setOnInsert": {"id": str(uuid.uuid4()), "clientId": "system", "usageCount": 0, "createdAt": now, **t}},
            upsert=True,
        )


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/templates")
async def list_templates(
    category: Optional[str] = None,
    format: Optional[str] = None,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None),
):
    """Return system templates + current user's custom templates."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = get_db()
    await ensure_system_templates()

    query: dict = {"$or": [{"clientId": "system"}, {"clientId": client_id}]}
    if category:
        query["category"] = category
    if format:
        query["format"] = format

    return await db.content_templates.find(query, {"_id": 0}).sort(
        [("clientId", 1), ("category", 1), ("name", 1)]
    ).to_list(300)


@router.post("/templates")
async def create_template(
    data: dict,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None),
):
    """Save a custom template for the current user."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = get_db()

    name = (data.get("name") or "").strip()
    script = (data.get("scriptTemplate") or "").strip()
    if not name or not script:
        raise HTTPException(status_code=400, detail="name and scriptTemplate are required")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "name": name,
        "category": data.get("category", "full-script"),
        "format": data.get("format", "short"),
        "description": data.get("description", ""),
        "scriptTemplate": script,
        "tags": data.get("tags", []),
        "usageCount": 0,
        "createdAt": now,
    }
    await db.content_templates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.patch("/templates/{template_id}/use")
async def increment_template_usage(
    template_id: str,
    user: dict = Depends(get_current_user),
):
    """Bump the usage counter when a template is applied."""
    db = get_db()
    await db.content_templates.update_one({"id": template_id}, {"$inc": {"usageCount": 1}})
    return {"ok": True}


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None),
):
    """Delete a user-created template (system templates are protected)."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = get_db()
    result = await db.content_templates.delete_one({"id": template_id, "clientId": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found or not yours to delete")
    return {"ok": True}
