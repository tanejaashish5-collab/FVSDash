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
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Try to upload data to S3 if configured.
    
    S3 is the PRIMARY storage destination for all FVS-generated media.
    If S3 is not configured or upload fails, returns None to signal fallback needed.
    
    Returns:
        Tuple of (url, storage_provider, error_message) 
        - On success: (s3_url, "s3", None)
        - On failure: (None, None, error_message)
    """
    try:
        from services.storage_service import upload_file, StorageNotConfiguredError, StorageUploadError
        
        url = await upload_file(data, content_type, path_hint)
        return url, "s3", None
    except ImportError:
        return None, None, "storage_service not available"
    except StorageNotConfiguredError as e:
        return None, None, str(e)
    except StorageUploadError as e:
        return None, None, f"S3 upload failed: {e}"
    except Exception as e:
        return None, None, f"Unexpected error: {e}"


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
        
        # S3 is the PRIMARY storage - try to upload first
        s3_url, storage_provider, s3_error = await _try_upload_to_s3(
            audio_data,
            "audio/mpeg",
            f"audio/elevenlabs/{uuid.uuid4()}"
        )
        
        warning = None
        if s3_url:
            audio_url = s3_url
            logger.info(f"Audio uploaded to S3: {len(audio_data)} bytes")
        else:
            # Graceful fallback: store as data URL with warning
            audio_b64 = base64.b64encode(audio_data).decode()
            audio_url = f"data:audio/mpeg;base64,{audio_b64}"
            storage_provider = "data_url"
            warning = f"S3 not configured - audio stored as data URL. {s3_error}"
            logger.warning(f"Audio fallback to data URL: {s3_error}")
        
        # Estimate duration (rough: ~150 words per minute, ~5 chars per word)
        estimated_duration = (len(truncated_text) / 5) / 150 * 60
        
        logger.info(f"Generated {len(audio_data)} bytes of audio via ElevenLabs")
        
        return AudioGenerationResult(
            url=audio_url,
            provider="elevenlabs",
            is_mocked=False,
            duration_seconds=estimated_duration,
            storage_provider=storage_provider,
            warning=warning
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
    provider: str = "openai",
    custom_prompt: str = None
) -> ThumbnailGenerationResult:
    """
    Generate a thumbnail image for an episode.
    
    Args:
        topic: The episode topic
        brand_voice: Client's brand voice description  
        title: The episode title
        format: Episode format (short/long)
        provider: Image generation provider ("openai", "stability" - future)
        custom_prompt: Optional custom prompt from Channel Profile
        
    Returns:
        ThumbnailGenerationResult with URL and metadata
    """
    if provider == "openai":
        return await _generate_thumbnail_openai(topic, brand_voice, title, format, custom_prompt)
    # TODO: Add "stability" provider when needed
    else:
        logger.warning(f"Unknown thumbnail provider '{provider}'. Falling back to OpenAI.")
        return await _generate_thumbnail_openai(topic, brand_voice, title, format, custom_prompt)


async def _generate_thumbnail_openai(
    topic: str,
    brand_voice: str,
    title: str,
    format: str,
    custom_prompt: str = None
) -> ThumbnailGenerationResult:
    """Generate thumbnail using OpenAI's image generation directly."""
    api_key = os.environ.get("OPENAI_API_KEY")
    
    if not api_key:
        logger.warning("OPENAI_API_KEY not configured. Using mocked thumbnail URL.")
        return ThumbnailGenerationResult(
            url=MOCK_THUMBNAIL_URL,
            provider="mock_openai",
            is_mocked=True,
            warning="OpenAI API key not configured. Using placeholder thumbnail."
        )

    # Use custom prompt from Channel Profile if provided, otherwise build default
    if custom_prompt:
        prompt = custom_prompt
    else:
        prompt = build_thumbnail_prompt(topic, brand_voice, title, format)

    try:
        import openai as openai_lib

        openai_client = openai_lib.AsyncOpenAI(api_key=api_key)

        # response_format="b64_json" returns the image inline in the API response.
        # This eliminates a second HTTP download and avoids CORS/expiry issues
        # with OpenAI's temporary image URLs.
        response = await openai_client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
            response_format="b64_json",
        )

        b64_data = response.data[0].b64_json
        if not b64_data:
            raise ValueError("DALL-E returned no image data")

        image_data = base64.b64decode(b64_data)

        # S3 is the PRIMARY storage - try to upload first
        s3_url, storage_provider, s3_error = await _try_upload_to_s3(
            image_data,
            "image/png",
            f"thumbnails/gpt-image/{uuid.uuid4()}"
        )

        warning = None
        if s3_url:
            image_url = s3_url
            logger.info(f"Thumbnail uploaded to S3: {len(image_data)} bytes")
        else:
            # Fallback: embed as data URL — always browser-accessible,
            # no CORS issues, no expiry. Safe to pass directly to <img src>.
            image_url = f"data:image/png;base64,{b64_data}"
            storage_provider = "data_url"
            warning = f"S3 not configured — thumbnail stored as data URL. {s3_error}"
            logger.warning(f"Thumbnail fallback to data URL: {s3_error}")

        logger.info(f"Generated thumbnail via OpenAI DALL-E-3 ({len(image_data)} bytes)")

        return ThumbnailGenerationResult(
            url=image_url,
            provider="openai_dall_e_3",
            is_mocked=False,
            prompt_used=prompt[:500],
            storage_provider=storage_provider,
            warning=warning
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
# STORAGE HELPERS - Now using services/storage_service.py
# =============================================================================

async def upload_to_storage(
    data: bytes,
    filename: str,
    content_type: str
) -> str:
    """
    Upload binary data to first-party storage and return public URL.
    
    This function now delegates to storage_service.upload_file().
    
    Args:
        data: Binary file data
        filename: Desired filename (used as path hint)
        content_type: MIME type
        
    Returns:
        Public URL to the uploaded file
        
    Raises:
        StorageNotConfiguredError: If S3 is not configured
        StorageUploadError: If the upload fails
    """
    from services.storage_service import upload_file
    return await upload_file(data, content_type, filename)


def get_storage_config() -> Dict[str, Any]:
    """
    Get current storage configuration.

    Returns:
        Dict with storage provider info and status
    """
    from services.storage_service import get_storage_config as _get_config
    return _get_config()


async def generate_captions_from_audio(audio_url: str) -> dict:
    """
    Generate SRT and VTT captions from an audio URL using OpenAI Whisper.
    Downloads the audio, transcribes it, and converts to SRT/VTT format.
    Returns: { srt, vtt, text, isMocked, warning }
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not configured — captions unavailable")
        return {
            "srt": "",
            "vtt": "",
            "text": "",
            "isMocked": True,
            "warning": "OpenAI API key not configured. Captions unavailable."
        }

    # Download audio file
    try:
        import httpx
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(audio_url)
            if resp.status_code != 200:
                raise Exception(f"Failed to download audio: HTTP {resp.status_code}")
            audio_data = resp.content
    except Exception as e:
        logger.error(f"Caption generation: audio download failed: {e}")
        return {"srt": "", "vtt": "", "text": "", "isMocked": True, "warning": f"Audio download failed: {e}"}

    # Call Whisper API
    try:
        import io
        from openai import AsyncOpenAI
        client_ai = AsyncOpenAI(api_key=api_key)
        audio_file = io.BytesIO(audio_data)
        audio_file.name = "audio.mp3"
        transcript = await client_ai.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"]
        )
    except Exception as e:
        logger.error(f"Caption generation: Whisper API failed: {e}")
        return {"srt": "", "vtt": "", "text": "", "isMocked": False, "warning": f"Whisper transcription failed: {e}"}

    # Convert to SRT and VTT
    segments = getattr(transcript, "segments", []) or []
    full_text = getattr(transcript, "text", "")

    def _fmt_time_srt(secs: float) -> str:
        h = int(secs // 3600)
        m = int((secs % 3600) // 60)
        s = int(secs % 60)
        ms = int((secs - int(secs)) * 1000)
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    def _fmt_time_vtt(secs: float) -> str:
        return _fmt_time_srt(secs).replace(",", ".")

    srt_lines = []
    vtt_lines = ["WEBVTT", ""]
    for i, seg in enumerate(segments):
        start = seg.get("start", 0)
        end = seg.get("end", start + 2)
        text = seg.get("text", "").strip()
        # SRT
        srt_lines.append(str(i + 1))
        srt_lines.append(f"{_fmt_time_srt(start)} --> {_fmt_time_srt(end)}")
        srt_lines.append(text)
        srt_lines.append("")
        # VTT
        vtt_lines.append(f"{_fmt_time_vtt(start)} --> {_fmt_time_vtt(end)}")
        vtt_lines.append(text)
        vtt_lines.append("")

    return {
        "srt": "\n".join(srt_lines),
        "vtt": "\n".join(vtt_lines),
        "text": full_text,
        "segmentCount": len(segments),
        "isMocked": False,
        "warning": None,
    }


# Popular ElevenLabs voice IDs for preview
_PREVIEW_VOICE_IDS = [
    {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "description": "Calm, professional female"},
    {"id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "description": "Strong, confident female"},
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "description": "Warm, soft female"},
    {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "description": "Well-rounded male"},
    {"id": "VR6AewLTigWG4xSOukaG", "name": "Arnold", "description": "Crisp, authoritative male"},
    {"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "description": "Deep, narrative male"},
    {"id": "yoZ06aMxZJJ28mfd3POQ", "name": "Sam", "description": "Raspy, intense male"},
]


async def preview_multiple_voices(preview_text: str, voice_ids: Optional[list] = None) -> dict:
    """
    Generate short audio previews using multiple ElevenLabs voices.
    Returns a list of { voiceId, name, description, url, isMocked } objects.
    """
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    voices_to_preview = []

    if voice_ids:
        for vid in voice_ids[:5]:
            voices_to_preview.append({"id": vid, "name": vid, "description": "Custom voice"})
    else:
        voices_to_preview = _PREVIEW_VOICE_IDS[:5]

    results = []
    for voice in voices_to_preview:
        if not api_key:
            results.append({
                "voiceId": voice["id"],
                "name": voice["name"],
                "description": voice.get("description", ""),
                "url": MOCK_AUDIO_URL,
                "isMocked": True,
                "warning": "ElevenLabs API key not configured"
            })
            continue

        try:
            import httpx
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice['id']}",
                    headers={"xi-api-key": api_key, "Content-Type": "application/json"},
                    json={"text": preview_text[:200], "model_id": "eleven_multilingual_v2",
                          "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}
                )
                if resp.status_code == 200:
                    audio_data = resp.content
                    s3_url, _, _ = await _try_upload_to_s3(audio_data, "audio/mpeg", f"previews/voice_{voice['id']}.mp3")
                    if s3_url:
                        preview_url = s3_url
                    else:
                        b64 = base64.b64encode(audio_data).decode()
                        preview_url = f"data:audio/mpeg;base64,{b64}"
                    results.append({"voiceId": voice["id"], "name": voice["name"], "description": voice.get("description", ""),
                                    "url": preview_url, "isMocked": False, "warning": None})
                else:
                    results.append({"voiceId": voice["id"], "name": voice["name"], "description": voice.get("description", ""),
                                    "url": MOCK_AUDIO_URL, "isMocked": True, "warning": f"ElevenLabs error: {resp.status_code}"})
        except Exception as e:
            logger.error(f"Voice preview error for {voice['id']}: {e}")
            results.append({"voiceId": voice["id"], "name": voice["name"], "description": voice.get("description", ""),
                            "url": MOCK_AUDIO_URL, "isMocked": True, "warning": str(e)})

    return {"voices": results, "previewText": preview_text}
