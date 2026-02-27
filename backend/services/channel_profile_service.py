"""
Channel Profile Service for ForgeVoice Studio.

Manages channel-specific brand settings that influence all AI-generated content:
- Language style (English, Hinglish, etc.)
- Thumbnail styling and templates
- Brand tone and personality
- Content pillars/themes
- Number of thumbnail options to generate

This "Brand Brain" ensures consistent AI outputs across Strategy Lab, FVS, and thumbnails.
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from dataclasses import dataclass, asdict
from fastapi import HTTPException

from db.mongo import channel_profiles_collection

logger = logging.getLogger(__name__)

# Default values for new channel profiles
DEFAULT_CHANNEL_PROFILE = {
    "languageStyle": "english",
    "thumbnailStyle": "modern_clean",
    "brandDescription": "",
    "tone": "professional and engaging",
    "contentPillars": [],
    "thumbnailPromptTemplate": "Professional YouTube thumbnail, high contrast, bold text, clean design",
    "scriptsPerIdea": 1,
    "thumbnailsPerShort": 1,  # Default to 1, can be set to 3 for multi-thumbnail selection
}

# Available language styles
LANGUAGE_STYLES = {
    "english": {
        "name": "English",
        "scriptInstructions": "Write in clear, conversational American English.",
        "includePerformanceCues": False
    },
    "hinglish": {
        "name": "Hinglish",
        "scriptInstructions": """Write the script in Hinglish: Hindi sentences written in Latin characters (Roman script), natural spoken rhythm, short punchy lines.
Use common Hindi expressions and phrases that Indian audiences would naturally use.
Include performance cues in square brackets like [short pause], [chuckles], [emphatic], [dramatic whisper], [raises voice].
Keep sentences short (5-10 words max). Use line breaks for pacing.
Example style:
"Dekho bhai [short pause] ye cheez bahut important hai.
[emphatic] Money ka matlab samjho.
[soft] Chanakya ne kaha tha..."
""",
        "includePerformanceCues": True
    },
    "hindi": {
        "name": "Hindi (Devanagari)",
        "scriptInstructions": "Write in Hindi using Devanagari script. Use formal but accessible language.",
        "includePerformanceCues": False
    },
    "spanish": {
        "name": "Spanish",
        "scriptInstructions": "Write in conversational Latin American Spanish.",
        "includePerformanceCues": False
    }
}

# Thumbnail style presets
THUMBNAIL_STYLES = {
    "modern_clean": {
        "name": "Modern Clean",
        "basePrompt": "Professional YouTube thumbnail, clean minimalist design, high contrast, bold readable text"
    },
    "black_minimal": {
        "name": "Black Minimal (Chanakya Style)",
        "basePrompt": "Pure black background, bold white text, single gold accent line or element, no faces, extremely high contrast, dramatic lighting, YouTube Short thumbnail, 9:16 aspect ratio"
    },
    "vibrant_bold": {
        "name": "Vibrant Bold",
        "basePrompt": "Bright vibrant colors, bold expressive text, eye-catching design, high energy YouTube thumbnail"
    },
    "cinematic": {
        "name": "Cinematic",
        "basePrompt": "Cinematic film-style thumbnail, dramatic lighting, moody atmosphere, professional color grading"
    },
    "custom": {
        "name": "Custom",
        "basePrompt": ""  # Uses thumbnailPromptTemplate directly
    }
}


@dataclass
class ChannelProfile:
    """Channel Profile data model."""
    id: str
    clientId: str
    languageStyle: str = "english"
    thumbnailStyle: str = "modern_clean"
    brandDescription: str = ""
    tone: str = "professional and engaging"
    contentPillars: list = None
    thumbnailPromptTemplate: str = "Professional YouTube thumbnail, high contrast, bold text, clean design"
    scriptsPerIdea: int = 1
    thumbnailsPerShort: int = 1
    createdAt: str = ""
    updatedAt: str = ""
    
    def __post_init__(self):
        if self.contentPillars is None:
            self.contentPillars = []


async def get_channel_profile(client_id: str) -> Dict[str, Any]:
    """
    Get the channel profile for a client.
    
    Creates a default profile if none exists.
    
    Args:
        client_id: The client ID
        
    Returns:
        Channel profile dict
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required")
    
    db = channel_profiles_collection()
    profile = await db.find_one({"clientId": client_id}, {"_id": 0})
    
    if not profile:
        # Create default profile
        now = datetime.now(timezone.utc).isoformat()
        profile = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            **DEFAULT_CHANNEL_PROFILE,
            "createdAt": now,
            "updatedAt": now
        }
        await db.insert_one(profile)
        if "_id" in profile:
            del profile["_id"]
        logger.info(f"Created default channel profile for client {client_id}")
    
    return profile


async def update_channel_profile(client_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update the channel profile for a client.
    
    Args:
        client_id: The client ID
        data: Profile fields to update
        
    Returns:
        Updated channel profile dict
    """
    if not client_id:
        raise HTTPException(status_code=400, detail="Client ID required")
    
    db = channel_profiles_collection()
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate language style
    if "languageStyle" in data and data["languageStyle"] not in LANGUAGE_STYLES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid language style. Must be one of: {list(LANGUAGE_STYLES.keys())}"
        )
    
    # Validate thumbnail style
    if "thumbnailStyle" in data and data["thumbnailStyle"] not in THUMBNAIL_STYLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid thumbnail style. Must be one of: {list(THUMBNAIL_STYLES.keys())}"
        )
    
    # Validate thumbnailsPerShort
    if "thumbnailsPerShort" in data:
        num = data["thumbnailsPerShort"]
        if not isinstance(num, int) or num < 1 or num > 4:
            raise HTTPException(status_code=400, detail="thumbnailsPerShort must be between 1 and 4")
    
    # Build update fields
    update_fields = {"updatedAt": now}
    allowed_fields = [
        "languageStyle", "thumbnailStyle", "brandDescription", "tone",
        "contentPillars", "thumbnailPromptTemplate", "scriptsPerIdea", "thumbnailsPerShort"
    ]
    
    for field in allowed_fields:
        if field in data:
            update_fields[field] = data[field]
    
    # Check if profile exists
    existing = await db.find_one({"clientId": client_id})
    
    if existing:
        await db.update_one(
            {"clientId": client_id},
            {"$set": update_fields}
        )
    else:
        # Create new profile with defaults + updates
        profile = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            **DEFAULT_CHANNEL_PROFILE,
            **update_fields,
            "createdAt": now
        }
        await db.insert_one(profile)
    
    # Return updated profile
    profile = await db.find_one({"clientId": client_id}, {"_id": 0})
    logger.info(f"Updated channel profile for client {client_id}")
    return profile


def get_script_instructions(profile: Dict[str, Any]) -> str:
    """
    Generate script writing instructions based on channel profile.
    
    Args:
        profile: Channel profile dict
        
    Returns:
        String with script writing instructions for LLM prompt
    """
    language_style = profile.get("languageStyle", "english")
    language_config = LANGUAGE_STYLES.get(language_style, LANGUAGE_STYLES["english"])
    
    brand_description = profile.get("brandDescription", "")
    tone = profile.get("tone", "professional and engaging")
    pillars = profile.get("contentPillars", [])
    
    instructions = []
    
    # Language instructions
    instructions.append(f"LANGUAGE & STYLE:\n{language_config['scriptInstructions']}")
    
    # Brand context
    if brand_description:
        instructions.append(f"\nBRAND CONTEXT:\n{brand_description}")
    
    # Tone
    instructions.append(f"\nTONE:\nWrite with a {tone} tone.")
    
    # Content pillars
    if pillars:
        pillars_text = ", ".join(pillars)
        instructions.append(f"\nCONTENT THEMES:\nFocus on themes related to: {pillars_text}")
    
    return "\n".join(instructions)


def get_thumbnail_prompt(profile: Dict[str, Any], topic: str, title: str, variation_hint: str = "") -> str:
    """
    Generate thumbnail prompt based on channel profile.
    
    Args:
        profile: Channel profile dict
        topic: Episode topic
        title: Episode title
        variation_hint: Optional hint for creating variations (e.g., "focus on text", "focus on symbol")
        
    Returns:
        String with thumbnail generation prompt
    """
    thumbnail_style = profile.get("thumbnailStyle", "modern_clean")
    style_config = THUMBNAIL_STYLES.get(thumbnail_style, THUMBNAIL_STYLES["modern_clean"])
    
    # Use custom template if style is "custom", otherwise use preset
    if thumbnail_style == "custom":
        base_prompt = profile.get("thumbnailPromptTemplate", style_config["basePrompt"])
    else:
        base_prompt = style_config["basePrompt"]
        # Append custom template if provided
        custom_template = profile.get("thumbnailPromptTemplate", "")
        if custom_template and custom_template != DEFAULT_CHANNEL_PROFILE["thumbnailPromptTemplate"]:
            base_prompt = f"{base_prompt}, {custom_template}"
    
    # Build final prompt
    prompt_parts = [base_prompt]
    
    # Add topic context
    if topic:
        # Extract 3-4 key words from topic for text overlay
        key_words = topic.split()[:4]
        prompt_parts.append(f"Text overlay showing: '{' '.join(key_words)}'")
    
    # Add variation hint for generating multiple options
    if variation_hint:
        prompt_parts.append(variation_hint)
    
    return ", ".join(prompt_parts)


def get_available_language_styles() -> Dict[str, str]:
    """Get list of available language styles for UI dropdown."""
    return {key: config["name"] for key, config in LANGUAGE_STYLES.items()}


def get_available_thumbnail_styles() -> Dict[str, str]:
    """Get list of available thumbnail styles for UI dropdown."""
    return {key: config["name"] for key, config in THUMBNAIL_STYLES.items()}
