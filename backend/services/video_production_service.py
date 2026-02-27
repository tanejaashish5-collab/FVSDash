"""
Video Production Service — ForgeVoice Studio
FFmpeg-based pipeline for stitching AI-generated clips into complete videos.

Supports:
  - YouTube Shorts (9:16, 60-90 seconds): Pure Veo clips + voiceover + captions
  - Long-form (16:9, 5-10 min): AI images (Ken Burns) + Veo hero clips + voiceover + captions
  - Caption burning: word-level, white bold, bottom-third overlay
  - Background music mixing at -20dB under voice
  - Automatic aspect ratio handling

Cost guidance (approx):
  - Shorts: ~$0.50-1.00 per video (8-10 Veo clips)
  - Long-form: ~$3-8 per video (images + 5-8 Veo hero clips)

Requirements:
  - FFmpeg must be installed (confirmed available on Railway via nixpacks.toml)
  - GEMINI_API_KEY for scene splitting
  - VEO_API_KEY for video clip generation
  - ELEVENLABS_API_KEY for voiceover
"""

import os
import uuid
import asyncio
import logging
import json
import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Local temp dir for video processing
TEMP_DIR = Path(os.environ.get("VIDEO_TEMP_DIR", "/tmp/fvs_video"))
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Background music directory (royalty-free, committed to repo)
MUSIC_DIR = Path(__file__).parent.parent / "assets" / "music"

# ─────────────────────────────────────────────
# FFMPEG UTILITIES
# ─────────────────────────────────────────────

def _run_ffmpeg(cmd: list, timeout: int = 300) -> subprocess.CompletedProcess:
    """Run an ffmpeg command, raise on non-zero exit."""
    full_cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + cmd
    logger.info(f"FFmpeg: {' '.join(full_cmd[:8])}...")
    result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr[:500]}")
    return result


def _get_video_duration(path: str) -> float:
    """Return video duration in seconds using ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True, timeout=30
    )
    try:
        return float(result.stdout.strip())
    except ValueError:
        return 0.0


# ─────────────────────────────────────────────
# SCENE SPLITTING (Gemini)
# ─────────────────────────────────────────────

async def split_script_into_scenes(script: str, format_type: str = "short") -> list[dict]:
    """
    Use Gemini to split a script into visual scenes for video generation.

    Returns list of:
    {
        "scene_index": 0,
        "type": "veo" | "image",   # veo = AI video clip, image = AI image + Ken Burns
        "duration_seconds": 8,
        "script_segment": "The text spoken during this scene",
        "visual_prompt": "Cinematic description for Veo or image generation API",
        "is_hero": False  # True for most important scenes (always use Veo)
    }
    """
    from services.ai_service import call_gemini

    if format_type == "short":
        prompt = f"""Split this YouTube Shorts script into 8-10 visual scenes for AI video generation.

Script:
{script}

Rules:
- Each scene = 7-9 seconds of video content
- ALL scenes should be type "veo" (we'll generate video clips for everything)
- Each visual_prompt should be a CINEMATIC description: dark moody aesthetic, dramatic lighting, Indian business/philosophy theme
- Include motion in prompts (camera pan, zoom in, person walking, text appearing)
- Match the visual to what's being spoken in that segment

Return ONLY a valid JSON array, no other text:
[
  {{
    "scene_index": 0,
    "type": "veo",
    "duration_seconds": 8,
    "script_segment": "exact words spoken during this scene",
    "visual_prompt": "cinematic prompt for video generation",
    "is_hero": true
  }}
]"""
    else:
        # Long-form: mix of images and Veo clips to control cost
        prompt = f"""Split this long-form content script into visual scenes.

Script:
{script}

Rules:
- Aim for 1 scene per 5-6 seconds of content
- Mark important/impactful moments as type "veo" (max 8 hero clips), rest as type "image"
- "image" scenes: generate an AI image and apply slow zoom/pan (Ken Burns effect)
- "veo" scenes: generate actual video with Veo AI
- Visual prompts for "image": dramatic still composition, business/philosophy theme, Indian aesthetic
- Visual prompts for "veo": cinematic motion, dramatic action, storytelling moment
- Duration for "image" scenes: 4-6 seconds each
- Duration for "veo" scenes: 8-9 seconds each

Return ONLY a valid JSON array:
[
  {{
    "scene_index": 0,
    "type": "image",
    "duration_seconds": 5,
    "script_segment": "words spoken",
    "visual_prompt": "prompt for image/video generation",
    "is_hero": false
  }}
]"""

    try:
        response = await call_gemini(prompt, max_tokens=3000)
        # Strip markdown code blocks if present
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        scenes = json.loads(response)
        return scenes
    except json.JSONDecodeError as e:
        logger.error(f"Scene splitting JSON parse error: {e}\nResponse: {response[:500]}")
        # Fallback: single scene
        return [{
            "scene_index": 0,
            "type": "veo",
            "duration_seconds": min(len(script.split()) * 0.4, 90),
            "script_segment": script,
            "visual_prompt": "Dramatic business leader silhouette against city skyline, dark moody cinematic",
            "is_hero": True
        }]
    except Exception as e:
        logger.error(f"Scene splitting failed: {e}")
        raise


# ─────────────────────────────────────────────
# VIDEO CLIP GENERATION (Veo)
# ─────────────────────────────────────────────

async def generate_veo_clip(prompt: str, duration: int = 8, aspect: str = "9:16") -> str:
    """
    Generate a single video clip using Google Veo 2.
    Returns local file path to the downloaded .mp4
    """
    from services.video_task_service import create_video_task

    veo_key = os.environ.get("VEO_API_KEY")
    if not veo_key:
        # Mock: return a stock video placeholder
        return await _get_mock_video_clip(aspect)

    try:
        from google import genai
        from google.genai import types as genai_types

        client = genai.Client(api_key=veo_key, http_options={"api_version": "v1beta"})

        # Generate video
        operation = client.models.generate_videos(
            model="veo-2.0-generate-001",
            prompt=prompt,
            config=genai_types.GenerateVideosConfig(
                aspect_ratio=aspect,
                duration_seconds=duration,
                number_of_videos=1,
            )
        )

        # Poll for completion (Veo is async)
        while not operation.done:
            await asyncio.sleep(5)
            operation = client.operations.get(operation)

        if not operation.result or not operation.result.generated_videos:
            raise RuntimeError("Veo returned no videos")

        video = operation.result.generated_videos[0]

        # Download the video
        job_id = str(uuid.uuid4())[:8]
        local_path = str(TEMP_DIR / f"veo_{job_id}.mp4")

        # video.video.uri should contain the download URL
        video_uri = video.video.uri if hasattr(video.video, 'uri') else None
        if not video_uri:
            return await _get_mock_video_clip(aspect)

        import httpx
        async with httpx.AsyncClient() as http:
            resp = await http.get(video_uri, timeout=120)
            with open(local_path, "wb") as f:
                f.write(resp.content)

        return local_path

    except Exception as e:
        logger.error(f"Veo clip generation failed: {e}")
        return await _get_mock_video_clip(aspect)


async def _get_mock_video_clip(aspect: str = "9:16") -> str:
    """Download a royalty-free placeholder clip for testing."""
    # Use FFmpeg to generate a test pattern video
    job_id = str(uuid.uuid4())[:8]
    local_path = str(TEMP_DIR / f"mock_{job_id}.mp4")

    if aspect == "9:16":
        size = "1080x1920"
    else:
        size = "1920x1080"

    # Generate a simple dark background with text as mock clip
    _run_ffmpeg([
        "-f", "lavfi",
        "-i", f"color=c=0x0a0a0f:size={size}:rate=30",
        "-vf", f"drawtext=text='ForgeVoice Studio':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2",
        "-t", "8",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        local_path
    ])
    return local_path


# ─────────────────────────────────────────────
# IMAGE GENERATION (for Long-form Ken Burns)
# ─────────────────────────────────────────────

async def generate_ai_image(prompt: str) -> str:
    """Generate an AI image using Google Imagen or DALL-E. Returns local path."""
    job_id = str(uuid.uuid4())[:8]
    local_path = str(TEMP_DIR / f"img_{job_id}.jpg")

    # Try Google Imagen 3 via Veo API key (same GCP project)
    try:
        imagen_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
        if imagen_key:
            from google import genai
            from google.genai import types as genai_types
            client = genai.Client(api_key=imagen_key)

            enhanced_prompt = f"Cinematic, dark moody aesthetic, Indian business philosophy theme, 4K quality. {prompt}"
            response = client.models.generate_images(
                model="imagen-3.0-generate-001",
                prompt=enhanced_prompt,
                config=genai_types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio="16:9",
                    safety_filter_level="block_few",
                )
            )
            if response.generated_images:
                image_data = response.generated_images[0].image.image_bytes
                with open(local_path, "wb") as f:
                    f.write(image_data)
                return local_path
    except Exception as e:
        logger.warning(f"Imagen 3 failed, trying DALL-E: {e}")

    # Fallback: DALL-E
    try:
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key)
            enhanced_prompt = f"Cinematic dark moody photo, Indian business/philosophy aesthetic: {prompt}"
            response = await client.images.generate(
                model="dall-e-3",
                prompt=enhanced_prompt[:1000],
                size="1792x1024",
                quality="standard",
                n=1
            )
            image_url = response.data[0].url
            import httpx
            async with httpx.AsyncClient() as http:
                resp = await http.get(image_url, timeout=60)
                with open(local_path, "wb") as f:
                    f.write(resp.content)
            return local_path
    except Exception as e:
        logger.warning(f"DALL-E failed: {e}")

    # Final fallback: dark gradient placeholder
    _run_ffmpeg([
        "-f", "lavfi",
        "-i", "color=c=0x1a1a2e:size=1920x1080:rate=1",
        "-vf", f"drawtext=text='{prompt[:30]}':fontsize=40:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2",
        "-t", "1",
        "-frames:v", "1",
        local_path
    ])
    return local_path


# ─────────────────────────────────────────────
# KEN BURNS EFFECT (Image → Video)
# ─────────────────────────────────────────────

def apply_ken_burns(image_path: str, duration: float = 5.0, aspect: str = "16:9") -> str:
    """Apply slow zoom-pan effect to a still image, returning a video clip."""
    job_id = str(uuid.uuid4())[:8]
    output_path = str(TEMP_DIR / f"kb_{job_id}.mp4")

    if aspect == "9:16":
        w, h = 1080, 1920
    else:
        w, h = 1920, 1080

    frames = int(duration * 30)  # 30fps

    # Ken Burns: scale up slightly then slowly zoom in
    vf = (
        f"scale={w*2}:{h*2},"
        f"zoompan=z='min(zoom+0.0015,1.5)':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"s={w}x{h}:fps=30,"
        f"setsar=1"
    )

    _run_ffmpeg([
        "-loop", "1",
        "-i", image_path,
        "-vf", vf,
        "-t", str(duration),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        output_path
    ], timeout=120)
    return output_path


# ─────────────────────────────────────────────
# CAPTION BURNING
# ─────────────────────────────────────────────

def burn_captions(video_path: str, script_text: str, output_path: str, style: str = "shorts") -> str:
    """
    Burn word-level captions onto video.

    For Shorts: large white bold text, bottom third, 2-3 words at a time
    For Long-form: smaller subtitle style, bottom 10%
    """
    if style == "shorts":
        fontsize = 72
        y_pos = "h*0.75"
        box_opacity = 0.5
        max_words_per_line = 3
    else:
        fontsize = 48
        y_pos = "h*0.88"
        box_opacity = 0.3
        max_words_per_line = 6

    # Build caption segments (simple word chunking without ElevenLabs timestamps)
    words = script_text.split()
    segments = []
    total_duration = _get_video_duration(video_path)

    if total_duration <= 0:
        logger.warning("Could not get video duration for captions, skipping")
        return video_path

    # Distribute words evenly across duration
    words_per_second = len(words) / max(total_duration, 1)
    chunk_size = max_words_per_line

    for i in range(0, len(words), chunk_size):
        chunk = words[i:i + chunk_size]
        start_sec = (i / words_per_second)
        end_sec = ((i + len(chunk)) / words_per_second)
        segments.append({
            "text": " ".join(chunk).upper(),
            "start": start_sec,
            "end": min(end_sec, total_duration)
        })

    if not segments:
        return video_path

    # Build FFmpeg drawtext filter chain
    drawtext_parts = []
    for seg in segments:
        text = seg["text"].replace("'", "\\'").replace(":", "\\:")
        drawtext_parts.append(
            f"drawtext=text='{text}'"
            f":fontsize={fontsize}"
            f":fontcolor=white"
            f":fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
            f":x=(w-text_w)/2"
            f":y={y_pos}"
            f":box=1:boxcolor=black@{box_opacity}:boxborderw=10"
            f":enable='between(t,{seg['start']:.2f},{seg['end']:.2f})'"
        )

    vf = ",".join(drawtext_parts)

    _run_ffmpeg([
        "-i", video_path,
        "-vf", vf,
        "-c:a", "copy",
        "-c:v", "libx264",
        "-preset", "fast",
        output_path
    ], timeout=300)
    return output_path


# ─────────────────────────────────────────────
# AUDIO MIXING
# ─────────────────────────────────────────────

async def generate_voiceover(script_text: str, voice_id: Optional[str] = None) -> str:
    """Generate voiceover using ElevenLabs. Returns local .mp3 path."""
    from services.media_service import generate_voice_for_script

    result = await generate_voice_for_script(script_text=script_text, voice_id=voice_id)

    if result.get("warning"):
        # Mock mode - create a silent audio file
        job_id = str(uuid.uuid4())[:8]
        silent_path = str(TEMP_DIR / f"voice_{job_id}.mp3")
        # Generate silence using FFmpeg
        duration = len(script_text.split()) * 0.4  # rough estimate
        _run_ffmpeg([
            "-f", "lavfi",
            "-i", f"anullsrc=r=44100:cl=mono",
            "-t", str(max(duration, 5)),
            "-c:a", "libmp3lame",
            "-q:a", "4",
            silent_path
        ])
        return silent_path

    # Result has file_path or url
    file_path = result.get("file_path") or result.get("url", "")

    if file_path.startswith("http"):
        # Download the audio
        job_id = str(uuid.uuid4())[:8]
        local_path = str(TEMP_DIR / f"voice_{job_id}.mp3")
        import httpx
        async with httpx.AsyncClient() as http:
            resp = await http.get(file_path, timeout=120)
            with open(local_path, "wb") as f:
                f.write(resp.content)
        return local_path

    return file_path


def mix_audio(video_path: str, voiceover_path: str, output_path: str,
               background_music_path: Optional[str] = None) -> str:
    """
    Merge voiceover (and optional background music at -20dB) with video.
    """
    if background_music_path and os.path.exists(background_music_path):
        # Mix: voiceover at full volume + music at -20dB
        _run_ffmpeg([
            "-i", video_path,
            "-i", voiceover_path,
            "-i", background_music_path,
            "-filter_complex",
            "[2:a]volume=0.1[music];"  # -20dB
            "[1:a][music]amix=inputs=2:duration=first:dropout_transition=2[final_audio]",
            "-map", "0:v",
            "-map", "[final_audio]",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            output_path
        ], timeout=300)
    else:
        # Just merge voiceover with video
        _run_ffmpeg([
            "-i", video_path,
            "-i", voiceover_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-map", "0:v",
            "-map", "1:a",
            "-shortest",
            output_path
        ], timeout=300)
    return output_path


# ─────────────────────────────────────────────
# CLIP CONCATENATION
# ─────────────────────────────────────────────

def concatenate_clips(clip_paths: list[str], output_path: str) -> str:
    """Concatenate multiple video clips into one. All clips must be same resolution."""
    if len(clip_paths) == 1:
        import shutil
        shutil.copy(clip_paths[0], output_path)
        return output_path

    # Write concat list file
    concat_file = str(TEMP_DIR / f"concat_{uuid.uuid4().hex[:8]}.txt")
    with open(concat_file, "w") as f:
        for path in clip_paths:
            f.write(f"file '{path}'\n")

    _run_ffmpeg([
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c", "copy",
        output_path
    ], timeout=300)

    os.remove(concat_file)
    return output_path


def resize_clip_to_aspect(clip_path: str, aspect: str = "9:16") -> str:
    """Resize/crop a clip to the target aspect ratio."""
    if aspect == "9:16":
        w, h = 1080, 1920
    else:
        w, h = 1920, 1080

    job_id = str(uuid.uuid4())[:8]
    output_path = str(TEMP_DIR / f"resized_{job_id}.mp4")

    # Scale and crop to fill
    vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"

    _run_ffmpeg([
        "-i", clip_path,
        "-vf", vf,
        "-c:a", "copy",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        output_path
    ], timeout=180)
    return output_path


# ─────────────────────────────────────────────
# GET BACKGROUND MUSIC
# ─────────────────────────────────────────────

def get_background_music(mood: str = "motivational") -> Optional[str]:
    """
    Return path to a royalty-free background music file.
    Music files should be placed in backend/assets/music/
    """
    MUSIC_DIR.mkdir(parents=True, exist_ok=True)

    # Look for mood-matching file
    for ext in [".mp3", ".wav", ".ogg"]:
        for pattern in [mood, "background", "music", "ambient"]:
            matches = list(MUSIC_DIR.glob(f"*{pattern}*{ext}"))
            if matches:
                return str(matches[0])

    # No music file found - return None (video will be voice-only)
    logger.info("No background music files found in assets/music/ — continuing without music")
    return None


# ─────────────────────────────────────────────
# UPLOAD FINAL VIDEO
# ─────────────────────────────────────────────

async def upload_final_video(local_path: str, filename: str) -> dict:
    """Upload the final video to S3/local storage. Returns URL."""
    from services.storage_service import get_storage_service
    storage = get_storage_service()

    with open(local_path, "rb") as f:
        video_data = f.read()

    result = await storage.upload_file(
        file_data=video_data,
        folder="final_videos",
        filename=filename,
        content_type="video/mp4"
    )
    return result


# ─────────────────────────────────────────────
# MAIN PIPELINE: PRODUCE SHORT (9:16, 60-90s)
# ─────────────────────────────────────────────

async def produce_short(
    script: str,
    title: str,
    voice_id: Optional[str] = None,
    job_id: Optional[str] = None,
    status_callback=None
) -> dict:
    """
    Full pipeline for a YouTube Short (9:16 vertical, 60-90 seconds).

    Steps:
    1. Split script into 8-10 visual scenes (Gemini)
    2. Generate voiceover (ElevenLabs)
    3. Generate video clips for each scene (Veo 2)
    4. Resize all clips to 9:16
    5. Concatenate clips
    6. Merge voiceover
    7. Burn captions
    8. Add background music
    9. Upload to storage

    Returns: {"url": str, "duration": float, "format": "short", "job_id": str}
    """
    if not job_id:
        job_id = str(uuid.uuid4())[:8]

    async def update_status(step: str, progress: int):
        logger.info(f"[Short {job_id}] {step} ({progress}%)")
        if status_callback:
            await status_callback(job_id, step, progress)

    try:
        await update_status("Splitting script into scenes", 5)
        scenes = await split_script_into_scenes(script, format_type="short")
        logger.info(f"[Short {job_id}] Generated {len(scenes)} scenes")

        await update_status("Generating voiceover", 10)
        voiceover_path = await generate_voiceover(script, voice_id=voice_id)

        # Generate video clips in parallel (max 3 at a time to avoid rate limits)
        await update_status("Generating video clips", 20)
        semaphore = asyncio.Semaphore(3)

        async def gen_clip_with_sem(scene):
            async with semaphore:
                return await generate_veo_clip(
                    prompt=scene["visual_prompt"],
                    duration=scene.get("duration_seconds", 8),
                    aspect="9:16"
                )

        clip_tasks = [gen_clip_with_sem(s) for s in scenes]
        clip_paths = await asyncio.gather(*clip_tasks)
        await update_status("Video clips generated", 50)

        # Resize all clips to 9:16
        await update_status("Normalising aspect ratios", 55)
        resized_paths = []
        for path in clip_paths:
            try:
                resized = resize_clip_to_aspect(path, "9:16")
                resized_paths.append(resized)
            except Exception as e:
                logger.warning(f"Resize failed for {path}: {e}, using original")
                resized_paths.append(path)

        # Concatenate all clips
        await update_status("Stitching clips together", 60)
        raw_video = str(TEMP_DIR / f"raw_{job_id}.mp4")
        concatenate_clips(resized_paths, raw_video)

        # Merge voiceover
        await update_status("Merging voiceover", 70)
        with_audio = str(TEMP_DIR / f"audio_{job_id}.mp4")
        music_path = get_background_music("motivational")
        mix_audio(raw_video, voiceover_path, with_audio, background_music_path=music_path)

        # Burn captions
        await update_status("Burning captions", 80)
        with_captions = str(TEMP_DIR / f"captions_{job_id}.mp4")
        try:
            burn_captions(with_audio, script, with_captions, style="shorts")
            final_local = with_captions
        except Exception as e:
            logger.warning(f"Caption burning failed: {e}, skipping captions")
            final_local = with_audio

        # Upload
        await update_status("Uploading to storage", 90)
        safe_title = "".join(c for c in title if c.isalnum() or c in " -_")[:40]
        filename = f"short_{safe_title}_{job_id}.mp4"
        upload_result = await upload_final_video(final_local, filename)

        duration = _get_video_duration(final_local)

        # Cleanup temp files
        _cleanup_temp_files(clip_paths + resized_paths + [raw_video, voiceover_path])

        await update_status("Complete", 100)

        return {
            "url": upload_result["url"],
            "duration": duration,
            "format": "short",
            "aspect_ratio": "9:16",
            "scene_count": len(scenes),
            "job_id": job_id,
            "filename": filename
        }

    except Exception as e:
        logger.error(f"[Short {job_id}] Production failed: {e}")
        raise


# ─────────────────────────────────────────────
# MAIN PIPELINE: PRODUCE LONG-FORM (16:9, 5-10min)
# ─────────────────────────────────────────────

async def produce_longform(
    script: str,
    title: str,
    voice_id: Optional[str] = None,
    job_id: Optional[str] = None,
    status_callback=None
) -> dict:
    """
    Full pipeline for a long-form YouTube video (16:9, 5-10 minutes).

    Cost-efficient approach:
    - Most scenes: AI images + Ken Burns effect (cheap)
    - Hero moments: Veo video clips (up to 8 per video)
    - Total cost: ~$3-8 per 5-minute video
    """
    if not job_id:
        job_id = str(uuid.uuid4())[:8]

    async def update_status(step: str, progress: int):
        logger.info(f"[Longform {job_id}] {step} ({progress}%)")
        if status_callback:
            await status_callback(job_id, step, progress)

    try:
        await update_status("Splitting script into scenes", 5)
        scenes = await split_script_into_scenes(script, format_type="longform")

        veo_scenes = [s for s in scenes if s["type"] == "veo"]
        image_scenes = [s for s in scenes if s["type"] == "image"]
        logger.info(f"[Longform {job_id}] {len(scenes)} scenes: {len(veo_scenes)} Veo + {len(image_scenes)} image")

        await update_status("Generating voiceover", 10)
        voiceover_path = await generate_voiceover(script, voice_id=voice_id)

        # Generate Veo clips (parallel, max 2 at a time)
        await update_status("Generating hero video clips", 20)
        veo_sem = asyncio.Semaphore(2)

        async def gen_veo_with_idx(scene):
            async with veo_sem:
                path = await generate_veo_clip(
                    prompt=scene["visual_prompt"],
                    duration=scene.get("duration_seconds", 8),
                    aspect="16:9"
                )
                return (scene["scene_index"], path)

        veo_results = await asyncio.gather(*[gen_veo_with_idx(s) for s in veo_scenes])
        veo_map = dict(veo_results)

        # Generate AI images (parallel, max 5 at a time)
        await update_status("Generating scene images", 40)
        img_sem = asyncio.Semaphore(5)

        async def gen_img_with_idx(scene):
            async with img_sem:
                img_path = await generate_ai_image(scene["visual_prompt"])
                # Apply Ken Burns effect to create video from image
                duration = scene.get("duration_seconds", 5)
                video_path = apply_ken_burns(img_path, duration=duration, aspect="16:9")
                return (scene["scene_index"], video_path)

        img_results = await asyncio.gather(*[gen_img_with_idx(s) for s in image_scenes])
        img_map = dict(img_results)

        await update_status("Stitching scenes in order", 65)

        # Assemble clips in scene_index order
        ordered_paths = []
        for scene in sorted(scenes, key=lambda x: x["scene_index"]):
            idx = scene["scene_index"]
            if idx in veo_map:
                resized = resize_clip_to_aspect(veo_map[idx], "16:9")
                ordered_paths.append(resized)
            elif idx in img_map:
                ordered_paths.append(img_map[idx])

        raw_video = str(TEMP_DIR / f"raw_{job_id}.mp4")
        concatenate_clips(ordered_paths, raw_video)

        # Mix voiceover
        await update_status("Merging voiceover and music", 75)
        with_audio = str(TEMP_DIR / f"audio_{job_id}.mp4")
        music_path = get_background_music("ambient")
        mix_audio(raw_video, voiceover_path, with_audio, background_music_path=music_path)

        # Burn captions
        await update_status("Burning subtitles", 85)
        with_captions = str(TEMP_DIR / f"captions_{job_id}.mp4")
        try:
            burn_captions(with_audio, script, with_captions, style="longform")
            final_local = with_captions
        except Exception as e:
            logger.warning(f"Caption burning failed: {e}")
            final_local = with_audio

        # Upload
        await update_status("Uploading final video", 92)
        safe_title = "".join(c for c in title if c.isalnum() or c in " -_")[:40]
        filename = f"longform_{safe_title}_{job_id}.mp4"
        upload_result = await upload_final_video(final_local, filename)

        duration = _get_video_duration(final_local)

        _cleanup_temp_files(
            list(veo_map.values()) + list(img_map.values()) +
            ordered_paths + [raw_video, voiceover_path]
        )

        await update_status("Complete", 100)

        return {
            "url": upload_result["url"],
            "duration": duration,
            "format": "longform",
            "aspect_ratio": "16:9",
            "scene_count": len(scenes),
            "veo_clips_used": len(veo_scenes),
            "image_scenes_used": len(image_scenes),
            "job_id": job_id,
            "filename": filename
        }

    except Exception as e:
        logger.error(f"[Longform {job_id}] Production failed: {e}")
        raise


# ─────────────────────────────────────────────
# CLEANUP
# ─────────────────────────────────────────────

def _cleanup_temp_files(paths: list):
    """Remove temp files after production is complete."""
    for path in paths:
        try:
            if path and os.path.exists(path):
                os.remove(path)
        except Exception:
            pass


# ─────────────────────────────────────────────
# PUBLIC API FUNCTION
# ─────────────────────────────────────────────

async def produce_video(
    script: str,
    title: str,
    format_type: str = "short",  # "short" or "longform"
    voice_id: Optional[str] = None,
    job_id: Optional[str] = None,
    status_callback=None
) -> dict:
    """
    Main entry point. Produce a complete video from a script.

    Args:
        script: The full spoken script text
        title: Video title (used for filename)
        format_type: "short" (9:16, 60-90s) or "longform" (16:9, 5-10min)
        voice_id: ElevenLabs voice ID (optional, uses default)
        job_id: External job ID for status tracking (optional)
        status_callback: async callable(job_id, step, progress) for real-time updates

    Returns:
        {"url": str, "duration": float, "format": str, "scene_count": int, "job_id": str}
    """
    if format_type == "short":
        return await produce_short(script, title, voice_id=voice_id, job_id=job_id, status_callback=status_callback)
    elif format_type == "longform":
        return await produce_longform(script, title, voice_id=voice_id, job_id=job_id, status_callback=status_callback)
    else:
        raise ValueError(f"Unknown format_type: {format_type}. Use 'short' or 'longform'")
