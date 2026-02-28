"""AI service - direct LLM integration via google-genai, openai, anthropic."""
import os
import uuid
import logging
from typing import Optional
from fastapi import HTTPException

logger = logging.getLogger(__name__)

LLM_PROVIDERS = {
    "gemini": {"model": "gemini-2.5-flash", "enabled": True},
    "openai": {"model": "gpt-4o", "enabled": True},
    "anthropic": {"model": "claude-sonnet-4-5-20250929", "enabled": True}
}

VIDEO_PROVIDERS = {
    "runway": {"enabled": False, "mock": True},
    "veo": {"enabled": True, "mock": False},
    "kling": {"enabled": True, "mock": True}
}


def get_enabled_llm_providers() -> list:
    providers = []
    if os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY"):
        providers.append("gemini")
    if os.environ.get("OPENAI_API_KEY"):
        providers.append("openai")
    if os.environ.get("ANTHROPIC_API_KEY"):
        providers.append("anthropic")
    return providers


def get_enabled_video_providers() -> list:
    providers = []
    for name, config in VIDEO_PROVIDERS.items():
        if config.get("enabled") or config.get("mock"):
            providers.append(name)
    return providers


async def call_gemini(prompt: str, max_tokens: int = 4096, system_message: str = None) -> str:
    """Direct Gemini call, returns raw text string. Used by calendar, fvs, trend services."""
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY not configured")
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        config_kwargs = {"max_output_tokens": max_tokens}
        if system_message:
            config_kwargs["system_instruction"] = system_message
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(**config_kwargs)
        )
        return response.text
    except Exception as e:
        logger.error(f"Gemini call failed: {e}")
        raise


async def call_llm(provider: str, task: str, input_data: dict) -> dict:
    """Universal LLM caller supporting gemini, openai, anthropic."""
    topic = input_data.get("topic", "")
    audience = input_data.get("audience", "")
    tone = input_data.get("tone", "")
    goal = input_data.get("goal", "")
    existing_content = input_data.get("existingContent", "")

    system_message = f"""You are an expert YouTube Shorts and podcast content strategist for the Indian market.
Channel niche: Business Strategy / Entrepreneur Mindset / Financial Wisdom (Chanakya Sutra style)
Target audience: {audience or 'Indian urban males 25-44, Hinglish-speaking'}
Brand voice: {tone or 'Bold, strategic, stoic wisdom meets modern hustle'}
Content goal: {goal or 'Educate and inspire with actionable business wisdom'}"""

    prompts = {
        "research": f"""Research this topic for a YouTube Shorts / podcast episode. Provide rich content that resonates with Indian entrepreneurs and business-minded viewers.

Topic: {topic}

Include:
- Key facts, statistics, and data points (include Indian market data where relevant)
- Ancient wisdom / philosophical angles (Chanakya, Sun Tzu, Stoic philosophy)
- Modern business examples (Indian startup ecosystem, global brands)
- Interesting controversy or debate angles
- Hook-worthy opening facts""",

        "outline": f"""Create a YouTube Shorts / podcast episode outline.

Topic: {topic}
{f'Research context: {existing_content[:2000]}' if existing_content else ''}

Provide structured outline:
- Hook (first 3 seconds for Shorts)
- 3-5 main points (crisp, punchy)
- Powerful closing line / CTA
- On-screen text suggestions for Shorts""",

        "script": f"""Write a YouTube Shorts script as pure spoken narration.

Topic: {topic}
Brand voice: {tone or 'Bold, strategic, authoritative'}
Target audience: {audience or 'Indian urban professionals 25-44'}
{f'Outline context: {existing_content[:2000]}' if existing_content else ''}

STRICT OUTPUT RULES:
- Return ONLY the spoken words, exactly as a voice actor will read them aloud
- NO section headers (no "Hook:", "Main:", "CTA:", "Outro:", "Introduction:" etc.)
- NO labels, bullet points, numbers, or structural markers of any kind
- NO stage directions ([PAUSE], [EMPHASIS], [CUT], etc.)
- Just continuous natural speech, first word to last
- 150-220 words (60-90 seconds spoken)
- Start with a powerful opening sentence that grabs attention immediately
- End with a strong insight or call to action woven naturally into the speech
- WRITE IN HINGLISH: this is mandatory, not optional. Mix Hindi words and phrases throughout the English script naturally (e.g., "yaar", "suno", "bhai", "seedha baat karo", "life mein", "sach mein", "kuch nahi", "bilkul sahi", "haan", "nahi", "jo log", "ek dum", "kya baat hai", "samajh lo")
- At least 25-35% of words/phrases should be Hindi/Hinglish woven into the English flow
- Avoid full Hindi sentences — mix naturally like: "Yaar, most entrepreneurs make this mistake…" or "Seedha baat karo — your business needs this"
- The tone should feel like a sharp, confident Indian creator speaking to peers, not a textbook English narrator""",

        "title": f"""Generate 5 compelling YouTube Shorts titles for an Indian business/entrepreneur audience.

Topic: {topic}
{f'Content: {existing_content[:1000]}' if existing_content else ''}

Requirements:
- Curiosity gap or bold claim format
- Mix of English and Hinglish options
- Under 60 characters
- Include power words (Secret, Rule, Truth, Strategy, Million, etc.)
- One title should be a question

Return just the 5 titles, one per line.""",

        "description": f"""Write a YouTube description for this business/entrepreneur content.

Topic: {topic}
{f'Content: {existing_content[:2000]}' if existing_content else ''}

Requirements:
- First line is the hook (show in search results)
- Summarise 3 key takeaways
- Include relevant hashtags at the end (#BusinessStrategy #Entrepreneur #Chanakya etc.)
- 100-200 words
- CTA: follow, like, comment""",

        "tags": f"""Generate YouTube tags for this business/entrepreneur content targeted at Indian audience.

Topic: {topic}
{f'Content: {existing_content[:1000]}' if existing_content else ''}

Provide 15 tags. Include: English + Hindi/Hinglish variations, topic-specific, audience-specific.
Return as comma-separated list.""",

        "chapters": f"""Create YouTube chapter timestamps for this content:

Topic: {topic}
{f'Content: {existing_content[:3000]}' if existing_content else ''}

Create 5-8 chapters. Format:
00:00 - Introduction
01:30 - [Chapter Title]
...

Make chapter titles punchy and curiosity-driven.""",

        "youtube_package": f"""Create a complete YouTube package for this business/entrepreneur content.

Topic: {topic}
{f'Content: {existing_content[:2000]}' if existing_content else ''}

Provide all 4 sections clearly labelled:
## TITLE IDEAS (5 options)
## DESCRIPTION
## TAGS
## CHAPTERS""",

        "propose_ideas": f"""Generate 5 specific YouTube Shorts / podcast episode ideas for this creator.

Channel context: {topic or 'Indian business strategy, entrepreneurship, financial wisdom (Chanakya Sutra style)'}
Brand voice: {tone or 'Bold, strategic, stoic wisdom meets modern hustle'}
Audience: {audience or 'Indian urban professionals 25-44'}

For each idea provide exactly this format:
IDEA: [punchy episode title under 60 chars]
HOOK: [first 5 words that stop the scroll]
ANGLE: [one sentence describing the unique content angle]

Generate 5 ideas. Be specific, not generic. Each should feel like a distinct viral concept."""
    }

    prompt = prompts.get(task)
    if not prompt:
        raise HTTPException(status_code=400, detail=f"Unknown task: {task}")

    try:
        if provider == "gemini":
            response_text = await call_gemini(prompt, max_tokens=4096, system_message=system_message)
        elif provider == "openai":
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=4096
            )
            response_text = response.choices[0].message.content
        elif provider == "anthropic":
            api_key = os.environ.get("ANTHROPIC_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=api_key)
            message = await client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=4096,
                system=system_message,
                messages=[{"role": "user", "content": prompt}]
            )
            response_text = message.content[0].text
        else:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

        return parse_llm_response(task, response_text)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"LLM call error ({provider}): {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


def parse_llm_response(task: str, response: str) -> dict:
    if task == "research":
        return {"researchSummary": response}
    elif task == "outline":
        lines = [l.strip() for l in response.split('\n') if l.strip()]
        return {"outlineSections": lines}
    elif task == "script":
        return {"scriptText": response}
    elif task == "title":
        titles = [l.strip() for l in response.split('\n') if l.strip() and not l.startswith('#')]
        return {"titleIdeas": titles[:5]}
    elif task == "description":
        return {"descriptionText": response}
    elif task == "tags":
        tags = [t.strip() for t in response.replace('\n', ',').split(',') if t.strip()]
        return {"tags": tags[:15]}
    elif task == "chapters":
        chapters = []
        for line in response.split('\n'):
            line = line.strip()
            if line and (' - ' in line or ':' in line):
                parts = line.split(' - ', 1) if ' - ' in line else line.split(': ', 1)
                if len(parts) == 2:
                    chapters.append({"timestamp": parts[0].strip(), "title": parts[1].strip()})
        return {"chapters": chapters[:12]}
    elif task == "propose_ideas":
        ideas = []
        current: dict = {}
        for line in response.split('\n'):
            line = line.strip()
            if line.startswith('IDEA:'):
                if current.get('title'):
                    ideas.append(current)
                current = {'title': line[5:].strip(), 'hook': '', 'angle': ''}
            elif line.startswith('HOOK:'):
                current['hook'] = line[5:].strip()
            elif line.startswith('ANGLE:'):
                current['angle'] = line[6:].strip()
        if current.get('title'):
            ideas.append(current)
        return {"ideas": ideas}
    elif task == "youtube_package":
        result = {"titleIdeas": [], "descriptionText": "", "tags": [], "chapters": []}
        current_section = None
        current_content = []
        for line in response.split('\n'):
            line_lower = line.lower().strip()
            if 'title' in line_lower and ('ideas' in line_lower or '##' in line):
                if current_section: _process_section(result, current_section, current_content)
                current_section = 'titles'; current_content = []
            elif 'description' in line_lower and '##' in line:
                if current_section: _process_section(result, current_section, current_content)
                current_section = 'description'; current_content = []
            elif 'tag' in line_lower and '##' in line:
                if current_section: _process_section(result, current_section, current_content)
                current_section = 'tags'; current_content = []
            elif 'chapter' in line_lower and '##' in line:
                if current_section: _process_section(result, current_section, current_content)
                current_section = 'chapters'; current_content = []
            elif line.strip():
                current_content.append(line)
        if current_section:
            _process_section(result, current_section, current_content)
        return result
    return {"raw": response}


def _process_section(result: dict, section: str, content: list):
    text = '\n'.join(content)
    if section == 'titles':
        titles = [l.strip().lstrip('0123456789.-) ') for l in content if l.strip() and '##' not in l]
        result["titleIdeas"] = titles[:5]
    elif section == 'description':
        result["descriptionText"] = text
    elif section == 'tags':
        tags = [t.strip() for t in text.replace('\n', ',').split(',') if t.strip()]
        result["tags"] = tags[:15]
    elif section == 'chapters':
        chapters = []
        for line in content:
            line = line.strip()
            if ' - ' in line or ': ' in line:
                parts = line.split(' - ', 1) if ' - ' in line else line.split(': ', 1)
                if len(parts) == 2:
                    chapters.append({"timestamp": parts[0].strip(), "title": parts[1].strip()})
        result["chapters"] = chapters[:12]
