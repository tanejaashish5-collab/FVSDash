"""AI service - LLM integration via emergentintegrations."""
import os
import uuid
import logging
from typing import Optional
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Provider configuration
LLM_PROVIDERS = {
    "gemini": {
        "model": "gemini-2.5-flash",
        "enabled": True
    },
    "openai": {
        "model": "gpt-4o",
        "enabled": True
    },
    "anthropic": {
        "model": "claude-sonnet-4-5-20250929",
        "enabled": True
    }
}

VIDEO_PROVIDERS = {
    "veo": {"enabled": True, "mock": False}
}


def get_enabled_llm_providers() -> list:
    """Return list of enabled LLM provider names."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if api_key:
        return ["gemini", "openai", "anthropic"]
    return []


def get_enabled_video_providers() -> list:
    """Return list of enabled video provider names."""
    return ["veo"]


async def call_llm(provider: str, task: str, input_data: dict) -> dict:
    """Universal LLM caller using emergentintegrations library."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    provider_config = LLM_PROVIDERS.get(provider)
    if not provider_config:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
    
    # Build the prompt based on task
    topic = input_data.get("topic", "")
    audience = input_data.get("audience", "")
    tone = input_data.get("tone", "")
    goal = input_data.get("goal", "")
    existing_content = input_data.get("existingContent", "")
    
    system_message = f"""You are an expert podcast content strategist and writer. 
Your target audience is: {audience or 'general podcast listeners'}
Tone/Brand voice: {tone or 'Professional and engaging'}
Content goal: {goal or 'Educate and inform'}"""

    prompts = {
        "research": f"""Research the following topic for a podcast episode. Provide comprehensive background information, key facts, statistics, expert opinions, and interesting angles to explore.

Topic: {topic}

Provide a detailed research summary that will help create compelling podcast content. Include:
- Key facts and statistics
- Expert perspectives and quotes to potentially include
- Interesting angles and subtopics
- Potential controversy or debate points
- Related trends or news""",

        "outline": f"""Create a detailed podcast episode outline for the following topic.

Topic: {topic}
{f'Research context: {existing_content[:2000]}' if existing_content else ''}

Provide a structured outline with:
- Introduction hook
- 4-6 main sections with key talking points
- Transition ideas between sections
- Conclusion and call-to-action

Format as a numbered list of sections with bullet points for each.""",

        "script": f"""Write a complete podcast script for the following topic.

Topic: {topic}
{f'Outline to follow: {existing_content[:3000]}' if existing_content else ''}

Write a conversational, engaging script that:
- Opens with a compelling hook
- Flows naturally between topics
- Includes specific examples and stories
- Has clear transitions
- Ends with a strong call-to-action

Write in a natural, conversational tone suitable for audio.""",

        "title": f"""Generate 5 compelling title ideas for a podcast episode about:

Topic: {topic}
{f'Script/Content: {existing_content[:1000]}' if existing_content else ''}

Create titles that are:
- Attention-grabbing and click-worthy
- SEO-friendly
- Clear about the value/topic
- Under 60 characters each

Return just the 5 titles, one per line.""",

        "description": f"""Write a compelling YouTube/podcast description for this episode:

Topic: {topic}
{f'Script/Content: {existing_content[:2000]}' if existing_content else ''}

Create a description that:
- Hooks viewers in the first line
- Summarizes key takeaways
- Includes timestamps placeholder
- Has a call-to-action
- Is SEO-optimized
- Is 150-300 words""",

        "tags": f"""Generate relevant tags/keywords for a podcast episode about:

Topic: {topic}
{f'Content: {existing_content[:1000]}' if existing_content else ''}

Provide 10-15 relevant tags for YouTube/podcast platforms. Include:
- Primary topic keywords
- Related subtopics
- Audience-relevant terms
- Trending related terms

Return as comma-separated list.""",

        "chapters": f"""Create YouTube chapter timestamps for this podcast content:

Topic: {topic}
{f'Script/Content: {existing_content[:3000]}' if existing_content else ''}

Create 6-10 chapters with timestamps. Format:
00:00 - Introduction
02:30 - [Section Title]
...

Make chapter titles descriptive and engaging.""",

        "youtube_package": f"""Create a complete YouTube package for this podcast episode:

Topic: {topic}
{f'Script/Content: {existing_content[:2000]}' if existing_content else ''}

Provide:
1. TITLE IDEAS (5 options)
2. DESCRIPTION (SEO-optimized, 150-300 words)
3. TAGS (10-15 comma-separated)
4. CHAPTERS (6-10 with timestamps)

Format each section clearly with headers."""
    }
    
    prompt = prompts.get(task)
    if not prompt:
        raise HTTPException(status_code=400, detail=f"Unknown task: {task}")
    
    try:
        session_id = f"strategy-{uuid.uuid4()}"
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model(provider, provider_config["model"])
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return parse_llm_response(task, response)
        
    except Exception as e:
        logger.error(f"LLM call error: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


def parse_llm_response(task: str, response: str) -> dict:
    """Parse LLM response into structured format based on task."""
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
    elif task == "youtube_package":
        result = {"titleIdeas": [], "descriptionText": "", "tags": [], "chapters": []}
        current_section = None
        current_content = []
        
        for line in response.split('\n'):
            line_lower = line.lower().strip()
            if 'title' in line_lower and ('ideas' in line_lower or '#' in line):
                if current_section:
                    _process_section(result, current_section, current_content)
                current_section = 'titles'
                current_content = []
            elif 'description' in line_lower and ('#' in line or line_lower.startswith('description')):
                if current_section:
                    _process_section(result, current_section, current_content)
                current_section = 'description'
                current_content = []
            elif 'tag' in line_lower and ('#' in line or line_lower.startswith('tag')):
                if current_section:
                    _process_section(result, current_section, current_content)
                current_section = 'tags'
                current_content = []
            elif 'chapter' in line_lower and ('#' in line or line_lower.startswith('chapter')):
                if current_section:
                    _process_section(result, current_section, current_content)
                current_section = 'chapters'
                current_content = []
            elif line.strip():
                current_content.append(line)
        
        if current_section:
            _process_section(result, current_section, current_content)
        
        return result
    return {"raw": response}


def _process_section(result: dict, section: str, content: list):
    """Helper to process YouTube package sections."""
    text = '\n'.join(content)
    if section == 'titles':
        titles = [l.strip().lstrip('0123456789.-) ') for l in content if l.strip() and not l.startswith('#')]
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
