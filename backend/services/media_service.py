"""
Media generation services for FVS System.
Provides abstracted interfaces for audio (voice) and image (thumbnail) generation.
Supports graceful fallbacks to mocked URLs when API keys are missing or errors occur.

Storage Integration:
    - If S3 is configured (via AWS_* env vars), generated media is uploaded to S3.
    - If S3 is not configured, media is returned as base64 data URLs or provider URLs.
    - See services/storage_service.py for S3 configuration details.
"""
import os
import uuid
import base64
import logging
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Mock URLs for fallback
MOCK_AUDIO_URL = "https://storage.googleapis.com/fvs-mock/audio-placeholder.mp3"
MOCK_THUMBNAIL_URL = "https://via.placeholder.com/1280x720/6366F1/FFFFFF?text=FVS+Generated"

# Default ElevenLabs voice ID (Rachel - clear, professional female voice)
DEFAULT_ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"


@dataclass
class AudioGenerationResult:
    """Result from audio generation."""
    url: str
    provider: str
    is_mocked: bool
    warning: Optional[str] = None
    duration_seconds: Optional[float] = None
    storage_provider: Optional[str] = None  # "s3", "data_url", or "provider_url"


@dataclass
class ThumbnailGenerationResult:
    """Result from thumbnail generation."""
    url: str
    provider: str
    is_mocked: bool
    warning: Optional[str] = None
    prompt_used: Optional[str] = None
    storage_provider: Optional[str] = None  # "s3", "data_url", or "provider_url"


async def _try_upload_to_s3(
    data: bytes,
    content_type: str,
    path_hint: str
) -> tuple[Optional[str], Optional[str]]:
    """
    Try to upload data to S3 if configured.
    
    Returns:
        Tuple of (url, storage_provider) or (None, None) if S3 not available
    """
    try:
        from services.storage_service import upload_file, StorageNotConfiguredError
        
        url = await upload_file(data, content_type, path_hint)
        return url, "s3"
    except ImportError:
        logger.debug("storage_service not available")
        return None, None
    except Exception as e:
        # StorageNotConfiguredError or StorageUploadError
        logger.warning(f"S3 upload skipped: {e}")
        return None, None


# =============================================================================
# AUDIO GENERATION (ElevenLabs)
# =============================================================================

async def generate_voice_for_script(
    script_text: str,
    voice_id: Optional[str] = None,
    model_id: str = "eleven_multilingual_v2"
) -> AudioGenerationResult:
    """
    Generate voice audio from script text using ElevenLabs.
    
    Args:
        script_text: The script text to convert to speech
        voice_id: ElevenLabs voice ID (defaults to ELEVENLABS_VOICE_ID env var or Rachel)
        model_id: ElevenLabs model to use
        
    Returns:
        AudioGenerationResult with URL and metadata
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    
    if not api_key:
        logger.warning("ELEVENLABS_API_KEY not configured. Using mocked audio URL.")
        return AudioGenerationResult(
            url=MOCK_AUDIO_URL,
            provider="mock_elevenlabs",
            is_mocked=True,
            warning="ElevenLabs API key not configured. Using placeholder audio."
        )
    
    # Use configured voice ID or default
    effective_voice_id = voice_id or os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_ELEVENLABS_VOICE_ID)
    
    try:
        from elevenlabs import ElevenLabs
        from elevenlabs import VoiceSettings
        
        client = ElevenLabs(api_key=api_key)
        
        # Truncate script if too long (ElevenLabs has limits)
        max_chars = 5000  # Reasonable limit for TTS
        truncated_text = script_text[:max_chars] if len(script_text) > max_chars else script_text
        
        if len(script_text) > max_chars:
            logger.info(f"Script truncated from {len(script_text)} to {max_chars} chars for TTS")
        
        # Generate audio using ElevenLabs TTS
        voice_settings = VoiceSettings(
            stability=0.5,
            similarity_boost=0.75,
            style=0.0,
            use_speaker_boost=True
        )
        
        audio_generator = client.text_to_speech.convert(
            text=truncated_text,
            voice_id=effective_voice_id,
            model_id=model_id,
            voice_settings=voice_settings
        )
        
        # Collect audio data
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        if not audio_data:
            raise ValueError("No audio data received from ElevenLabs")
        
        # Convert to base64 data URL for now
        # TODO: P2 - Upload to first-party storage (S3/Google Drive) and return permanent URL
        audio_b64 = base64.b64encode(audio_data).decode()
        audio_url = f"data:audio/mpeg;base64,{audio_b64}"
        
        # Estimate duration (rough: ~150 words per minute, ~5 chars per word)
        estimated_duration = (len(truncated_text) / 5) / 150 * 60
        
        logger.info(f"Generated {len(audio_data)} bytes of audio via ElevenLabs")
        
        return AudioGenerationResult(
            url=audio_url,
            provider="elevenlabs",
            is_mocked=False,
            duration_seconds=estimated_duration
        )
        
    except Exception as e:
        logger.error(f"ElevenLabs audio generation failed: {e}")
        return AudioGenerationResult(
            url=MOCK_AUDIO_URL,
            provider="mock_elevenlabs",
            is_mocked=True,
            warning=f"ElevenLabs generation failed: {str(e)}. Using placeholder audio."
        )


# =============================================================================
# THUMBNAIL GENERATION (OpenAI / Abstracted)
# =============================================================================

def build_thumbnail_prompt(
    topic: str,
    brand_voice: str,
    title: str,
    format: str = "short"
) -> str:
    """
    Build an engaging thumbnail generation prompt from episode metadata.
    
    Args:
        topic: The episode topic
        brand_voice: Client's brand voice description
        title: The episode title
        format: Episode format (short/long)
        
    Returns:
        Optimized prompt for image generation
    """
    # Extract key style hints from brand voice
    style_hints = []
    brand_lower = brand_voice.lower() if brand_voice else ""
    
    if "professional" in brand_lower:
        style_hints.append("professional corporate style")
    if "fun" in brand_lower or "playful" in brand_lower:
        style_hints.append("vibrant colorful design")
    if "tech" in brand_lower or "ai" in brand_lower:
        style_hints.append("modern tech aesthetic with subtle gradients")
    if "warm" in brand_lower or "authentic" in brand_lower:
        style_hints.append("warm inviting tones")
    
    if not style_hints:
        style_hints = ["modern professional style", "clean design"]
    
    style_description = ", ".join(style_hints)
    
    # Build the prompt
    prompt = f"""Create a YouTube thumbnail for a podcast episode.

Topic: {topic}
Title: {title}
Style: {style_description}

Requirements:
- Eye-catching design optimized for YouTube thumbnails (1280x720)
- Bold, readable text overlay with the key message
- High contrast colors that pop on any background
- Professional podcast/content creator aesthetic
- {"Vertical format optimized for mobile (shorts)" if format == "short" else "Horizontal widescreen format"}
- No faces or people, focus on typography and abstract visuals
- Include visual elements representing the topic

Make it click-worthy and professional."""

    return prompt


async def generate_thumbnail(
    topic: str,
    brand_voice: str,
    title: str,
    format: str = "short",
    provider: str = "openai"
) -> ThumbnailGenerationResult:
    """
    Generate a thumbnail image for an episode.
    
    Args:
        topic: The episode topic
        brand_voice: Client's brand voice description  
        title: The episode title
        format: Episode format (short/long)
        provider: Image generation provider ("openai", "stability" - future)
        
    Returns:
        ThumbnailGenerationResult with URL and metadata
    """
    if provider == "openai":
        return await _generate_thumbnail_openai(topic, brand_voice, title, format)
    # TODO: Add "stability" provider when needed
    else:
        logger.warning(f"Unknown thumbnail provider '{provider}'. Falling back to OpenAI.")
        return await _generate_thumbnail_openai(topic, brand_voice, title, format)


async def _generate_thumbnail_openai(
    topic: str,
    brand_voice: str,
    title: str,
    format: str
) -> ThumbnailGenerationResult:
    """Generate thumbnail using OpenAI's image generation via Emergent."""
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    if not api_key:
        logger.warning("EMERGENT_LLM_KEY not configured. Using mocked thumbnail URL.")
        return ThumbnailGenerationResult(
            url=MOCK_THUMBNAIL_URL,
            provider="mock_openai",
            is_mocked=True,
            warning="OpenAI API key not configured. Using placeholder thumbnail."
        )
    
    prompt = build_thumbnail_prompt(topic, brand_voice, title, format)
    
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        # Generate image
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if not images or len(images) == 0:
            raise ValueError("No image was generated")
        
        # Convert to base64 data URL
        # TODO: P2 - Upload to first-party storage (S3/Google Drive) and return permanent URL
        image_b64 = base64.b64encode(images[0]).decode()
        image_url = f"data:image/png;base64,{image_b64}"
        
        logger.info(f"Generated thumbnail via OpenAI GPT-Image-1 ({len(images[0])} bytes)")
        
        return ThumbnailGenerationResult(
            url=image_url,
            provider="openai_gpt_image_1",
            is_mocked=False,
            prompt_used=prompt[:500]  # Store truncated prompt for debugging
        )
        
    except Exception as e:
        logger.error(f"OpenAI thumbnail generation failed: {e}")
        return ThumbnailGenerationResult(
            url=MOCK_THUMBNAIL_URL,
            provider="mock_openai",
            is_mocked=True,
            warning=f"OpenAI generation failed: {str(e)}. Using placeholder thumbnail.",
            prompt_used=prompt[:500]
        )


# =============================================================================
# STORAGE HELPERS (TODO: P2)
# =============================================================================

async def upload_to_storage(
    data: bytes,
    filename: str,
    content_type: str
) -> str:
    """
    Upload binary data to first-party storage and return public URL.
    
    TODO: P2 - Implement S3/Google Drive integration
    
    Args:
        data: Binary file data
        filename: Desired filename
        content_type: MIME type
        
    Returns:
        Public URL to the uploaded file
    """
    # Placeholder for P2 storage integration
    # For now, we're using provider-hosted URLs or base64 data URLs
    logger.warning("upload_to_storage() not yet implemented. Files stored as data URLs.")
    raise NotImplementedError("First-party storage not yet configured. Use provider URLs for now.")


def get_storage_config() -> Dict[str, Any]:
    """
    Get current storage configuration.
    
    Returns:
        Dict with storage provider info and status
    """
    return {
        "provider": "none",  # TODO: "s3" or "google_drive"
        "configured": False,
        "note": "P2: First-party storage not yet implemented. Using provider-hosted URLs."
    }
