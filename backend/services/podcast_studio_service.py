"""
Podcast Studio Service — ForgeVoice Studio

End-to-end pipeline for raw podcast → polished episode → viral clips.

Stage 1 (Polish):
  - Whisper transcription with timestamps
  - Audio enhancement (loudnorm, noise reduction, compression)
  - Video enhancement (color correction, sharpening)
  - Silence detection + AI smart cuts
  - Render polished episode with cuts applied

Stage 2 (Clip):
  - Gemini AI highlight detection (viral moments)
  - FFmpeg clip extraction + 9:16 crop
  - Animated caption burning (ASS subtitles)

Reuses:
  - media_service.py → Whisper transcription
  - video_production_service.py → _run_ffmpeg(), _get_video_duration()
  - storage_service.py → S3 upload
  - event_bus.py → SSE progress
  - ai_service.py → call_gemini()
"""

import os
import uuid
import json
import asyncio
import logging
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

TEMP_DIR = Path(os.environ.get("PODCAST_TEMP_DIR", "/tmp/fvs_podcast"))
TEMP_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────
# FFmpeg utilities (reuse patterns from video_production_service)
# ─────────────────────────────────────────────

def _run_ffmpeg(cmd: list, timeout: int = 600) -> subprocess.CompletedProcess:
    """Run an ffmpeg command with longer timeout for long podcasts."""
    full_cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"] + cmd
    logger.info(f"FFmpeg: {' '.join(full_cmd[:10])}...")
    result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr[:500]}")
    return result


def _run_ffprobe(cmd: list, timeout: int = 30) -> str:
    """Run an ffprobe command and return stdout."""
    full_cmd = ["ffprobe"] + cmd
    result = subprocess.run(full_cmd, capture_output=True, text=True, timeout=timeout)
    return result.stdout.strip()


def _get_duration(path: str) -> float:
    """Return media duration in seconds."""
    out = _run_ffprobe([
        "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path
    ])
    try:
        return float(out)
    except ValueError:
        return 0.0


def _get_video_info(path: str) -> dict:
    """Get video resolution and codec info."""
    out = _run_ffprobe([
        "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height,codec_name",
        "-of", "json", path
    ])
    try:
        data = json.loads(out)
        stream = data.get("streams", [{}])[0]
        return {
            "width": stream.get("width", 0),
            "height": stream.get("height", 0),
            "codec": stream.get("codec_name", "unknown"),
        }
    except (json.JSONDecodeError, IndexError):
        return {"width": 0, "height": 0, "codec": "unknown"}


# ─────────────────────────────────────────────
# STAGE 1: POLISH
# ─────────────────────────────────────────────

async def transcribe_podcast(file_path: str) -> dict:
    """
    Transcribe a podcast file using Whisper.
    For long files, extracts audio first then transcribes.
    Returns: { text, segments: [{start, end, text}], srt, vtt }
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return {
            "text": "", "segments": [], "srt": "", "vtt": "",
            "isMocked": True, "warning": "OPENAI_API_KEY not configured"
        }

    # Extract audio as mp3 for Whisper (smaller file, faster upload)
    audio_path = str(TEMP_DIR / f"podcast_audio_{uuid.uuid4().hex[:8]}.mp3")
    try:
        _run_ffmpeg([
            "-i", file_path,
            "-vn", "-acodec", "libmp3lame", "-q:a", "4",
            audio_path
        ], timeout=300)
    except Exception as e:
        logger.error(f"Audio extraction failed: {e}")
        return {"text": "", "segments": [], "srt": "", "vtt": "",
                "isMocked": True, "warning": f"Audio extraction failed: {e}"}

    # Whisper transcription
    try:
        import io
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key)

        with open(audio_path, "rb") as f:
            audio_data = f.read()

        audio_file = io.BytesIO(audio_data)
        audio_file.name = "podcast.mp3"

        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="verbose_json",
            timestamp_granularities=["segment"]
        )
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}")
        return {"text": "", "segments": [], "srt": "", "vtt": "",
                "isMocked": False, "warning": f"Whisper failed: {e}"}
    finally:
        _safe_remove(audio_path)

    segments = []
    for seg in getattr(transcript, "segments", []) or []:
        segments.append({
            "start": seg.get("start", 0),
            "end": seg.get("end", 0),
            "text": seg.get("text", "").strip(),
        })

    full_text = getattr(transcript, "text", "")

    # Build SRT
    srt_lines = []
    for i, seg in enumerate(segments):
        srt_lines.append(str(i + 1))
        srt_lines.append(f"{_fmt_srt(seg['start'])} --> {_fmt_srt(seg['end'])}")
        srt_lines.append(seg["text"])
        srt_lines.append("")

    # Build VTT
    vtt_lines = ["WEBVTT", ""]
    for seg in segments:
        vtt_lines.append(f"{_fmt_vtt(seg['start'])} --> {_fmt_vtt(seg['end'])}")
        vtt_lines.append(seg["text"])
        vtt_lines.append("")

    return {
        "text": full_text,
        "segments": segments,
        "segmentCount": len(segments),
        "srt": "\n".join(srt_lines),
        "vtt": "\n".join(vtt_lines),
        "isMocked": False,
        "warning": None,
    }


def enhance_audio(input_path: str, output_path: str) -> str:
    """
    Apply broadcast-quality audio enhancement using FFmpeg filters.
    - highpass: remove low rumble
    - afftdn: noise reduction
    - acompressor: dynamic range compression
    - loudnorm: broadcast loudness normalization (YouTube standard -16 LUFS)
    - equalizer: slight voice presence boost at 3kHz
    """
    filter_chain = (
        "highpass=f=80,"
        "afftdn=nf=-25,"
        "acompressor=threshold=-20dB:ratio=4:attack=5:release=50,"
        "loudnorm=I=-16:TP=-1.5:LRA=11,"
        "equalizer=f=3000:width_type=o:width=2:g=3"
    )
    _run_ffmpeg([
        "-i", input_path,
        "-af", filter_chain,
        "-c:v", "copy",  # Preserve video stream as-is
        output_path
    ], timeout=600)
    return output_path


def enhance_video(input_path: str, output_path: str) -> str:
    """
    Apply subtle video enhancement using FFmpeg filters.
    - eq: brightness/contrast/saturation correction
    - unsharp: mild sharpening
    """
    filter_chain = (
        "eq=brightness=0.02:contrast=1.1:saturation=1.1,"
        "unsharp=5:5:0.5:5:5:0.0"
    )
    _run_ffmpeg([
        "-i", input_path,
        "-vf", filter_chain,
        "-c:a", "copy",  # Preserve audio stream as-is
        output_path
    ], timeout=600)
    return output_path


def enhance_audio_and_video(input_path: str, output_path: str) -> str:
    """Apply both audio and video enhancement in a single FFmpeg pass."""
    audio_filter = (
        "highpass=f=80,"
        "afftdn=nf=-25,"
        "acompressor=threshold=-20dB:ratio=4:attack=5:release=50,"
        "loudnorm=I=-16:TP=-1.5:LRA=11,"
        "equalizer=f=3000:width_type=o:width=2:g=3"
    )
    video_filter = (
        "eq=brightness=0.02:contrast=1.1:saturation=1.1,"
        "unsharp=5:5:0.5:5:5:0.0"
    )
    _run_ffmpeg([
        "-i", input_path,
        "-af", audio_filter,
        "-vf", video_filter,
        output_path
    ], timeout=900)
    return output_path


def detect_silences(file_path: str, min_silence_sec: float = 2.0,
                    silence_thresh_db: float = -35) -> list[dict]:
    """
    Use FFmpeg silencedetect to find silence regions in audio.
    Returns list of {start, end, duration} for each silence.
    """
    cmd = [
        "ffmpeg", "-y", "-hide_banner",
        "-i", file_path,
        "-af", f"silencedetect=noise={silence_thresh_db}dB:d={min_silence_sec}",
        "-f", "null", "-"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    stderr = result.stderr

    silences = []
    current_start = None
    for line in stderr.split("\n"):
        if "silence_start:" in line:
            try:
                current_start = float(line.split("silence_start:")[1].strip().split()[0])
            except (ValueError, IndexError):
                pass
        elif "silence_end:" in line and current_start is not None:
            try:
                parts = line.split("silence_end:")[1].strip().split("|")
                end = float(parts[0].strip().split()[0])
                duration = end - current_start
                silences.append({
                    "start": round(current_start, 2),
                    "end": round(end, 2),
                    "duration": round(duration, 2),
                })
                current_start = None
            except (ValueError, IndexError):
                pass

    return silences


async def generate_smart_cuts(transcript_text: str, silences: list[dict],
                               total_duration: float) -> list[dict]:
    """
    Use Gemini to decide which silences to cut vs keep.
    Some silences are natural pauses that improve flow — AI decides.
    Returns list of {start, end, duration, action: 'cut'|'keep', reason}.
    """
    from services.ai_service import call_gemini

    silence_summary = json.dumps(silences[:50], indent=2)  # Limit for token budget

    prompt = f"""You are a professional podcast editor. Given these silence regions detected in a {total_duration:.0f}-second podcast, decide which silences to CUT (remove) and which to KEEP (natural pauses).

Silences detected:
{silence_summary}

Transcript excerpt (for context):
{transcript_text[:3000]}

Rules:
- CUT silences longer than 3 seconds (dead air, thinking pauses)
- KEEP silences of 1-2 seconds between topics (natural breathing room)
- KEEP silences that serve as dramatic pauses before important points
- CUT silences at the very beginning or end of the recording
- Be conservative — when in doubt, KEEP the silence

Return ONLY valid JSON array:
[
  {{
    "start": 12.5,
    "end": 15.8,
    "duration": 3.3,
    "action": "cut",
    "reason": "Long dead air between topics"
  }}
]"""

    try:
        response = await call_gemini(prompt, max_tokens=4000)
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        cuts = json.loads(response)
        return cuts
    except Exception as e:
        logger.error(f"Smart cuts generation failed: {e}")
        # Fallback: cut all silences > 3 seconds
        return [
            {**s, "action": "cut" if s["duration"] > 3.0 else "keep",
             "reason": "Auto: silence > 3s" if s["duration"] > 3.0 else "Auto: short pause kept"}
            for s in silences
        ]


def render_with_cuts(input_path: str, cuts: list[dict], output_path: str,
                     total_duration: float) -> str:
    """
    Render a polished version of the podcast with silence cuts removed.
    Uses FFmpeg select filter to keep only non-cut segments.
    """
    # Build list of segments to KEEP (inverse of cuts)
    cut_regions = sorted([c for c in cuts if c.get("action") == "cut"],
                         key=lambda x: x["start"])

    if not cut_regions:
        # Nothing to cut — just copy
        _run_ffmpeg(["-i", input_path, "-c", "copy", output_path])
        return output_path

    # Build segment list
    segments = []
    cursor = 0.0
    for cut in cut_regions:
        if cut["start"] > cursor:
            segments.append({"start": cursor, "end": cut["start"]})
        cursor = cut["end"]
    if cursor < total_duration:
        segments.append({"start": cursor, "end": total_duration})

    if not segments:
        _run_ffmpeg(["-i", input_path, "-c", "copy", output_path])
        return output_path

    # Use concat approach: extract each segment then concat
    work_dir = TEMP_DIR / f"cuts_{uuid.uuid4().hex[:8]}"
    work_dir.mkdir(parents=True, exist_ok=True)

    seg_files = []
    for i, seg in enumerate(segments):
        seg_path = str(work_dir / f"seg_{i:03d}.mp4")
        duration = seg["end"] - seg["start"]
        _run_ffmpeg([
            "-ss", str(seg["start"]),
            "-t", str(duration),
            "-i", input_path,
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            seg_path
        ])
        seg_files.append(seg_path)

    # Concat
    concat_list = str(work_dir / "concat.txt")
    with open(concat_list, "w") as f:
        for sf in seg_files:
            f.write(f"file '{sf}'\n")

    _run_ffmpeg([
        "-f", "concat", "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        output_path
    ])

    # Cleanup temp segments
    for sf in seg_files:
        _safe_remove(sf)
    _safe_remove(concat_list)
    try:
        work_dir.rmdir()
    except OSError:
        pass

    return output_path


# ─────────────────────────────────────────────
# STAGE 2: CLIP EXTRACTION
# ─────────────────────────────────────────────

async def detect_highlights(transcript_text: str, segments: list[dict],
                             total_duration: float, num_clips: int = 12) -> list[dict]:
    """
    Use Gemini to identify the best viral moments in a podcast transcript.
    Returns list of clip suggestions with timestamps and virality scores.
    """
    from services.ai_service import call_gemini

    # Build transcript with timestamps for context
    transcript_with_times = ""
    for seg in segments[:200]:  # Limit for token budget
        transcript_with_times += f"[{_fmt_mmss(seg['start'])}] {seg['text']}\n"

    prompt = f"""You are a viral content expert. This is a {total_duration/60:.0f}-minute podcast transcript.
Identify the {num_clips} BEST moments for YouTube Shorts (30-90 seconds each).

Transcript:
{transcript_with_times}

Look for:
- Viral hooks (controversial statements, surprising facts, bold claims)
- Complete stories or anecdotes with beginning, middle, end
- Actionable insights or practical advice
- Emotional peaks (humor, passion, vulnerability, intensity)
- Quotable one-liners WITH enough context (don't clip mid-thought)

Rules:
- Each clip MUST be 30-90 seconds long
- Clips must NOT overlap
- Start each clip 2-3 seconds before the key moment (context/hook)
- End each clip at a natural stopping point (not mid-sentence)
- Rank by virality potential (1-10 scale)

Return ONLY valid JSON array:
[
  {{
    "title": "Short catchy title for this clip",
    "start_time": 125.5,
    "end_time": 185.0,
    "hook": "The first sentence that grabs attention",
    "virality_score": 8,
    "reason": "Why this would go viral",
    "tags": ["motivation", "business"]
  }}
]"""

    try:
        response = await call_gemini(prompt, max_tokens=4000)
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
        highlights = json.loads(response)

        # Validate and fix timestamps
        validated = []
        for h in highlights:
            start = float(h.get("start_time", 0))
            end = float(h.get("end_time", start + 60))
            if end <= start:
                end = start + 60
            if end - start > 90:
                end = start + 90
            if end - start < 15:
                continue  # Too short
            if end > total_duration:
                end = total_duration
            h["start_time"] = round(start, 1)
            h["end_time"] = round(end, 1)
            h["duration"] = round(end - start, 1)
            validated.append(h)

        # Sort by virality score descending
        validated.sort(key=lambda x: x.get("virality_score", 0), reverse=True)
        return validated[:num_clips]
    except Exception as e:
        logger.error(f"Highlight detection failed: {e}")
        return []


def extract_clip(source_path: str, start: float, duration: float,
                 output_path: str, crop_vertical: bool = True) -> str:
    """
    Extract a clip from the source video at given timestamps.
    Optionally crop from 16:9 to 9:16 for vertical Shorts.
    """
    cmd = ["-ss", str(start), "-t", str(duration), "-i", source_path]

    if crop_vertical:
        # Center crop: take the center 9/16 of height from the width
        cmd += ["-vf", "crop=ih*9/16:ih,scale=1080:1920"]
    else:
        cmd += ["-vf", "scale=-2:1080"]  # Keep aspect ratio, scale to 1080p height

    cmd += [
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        output_path
    ]
    _run_ffmpeg(cmd, timeout=120)
    return output_path


def burn_captions(video_path: str, srt_content: str, output_path: str,
                  style: str = "modern") -> str:
    """
    Burn animated captions onto a video using ASS subtitles.
    Style presets:
    - modern: white bold, bottom third, semi-transparent background
    - minimal: white text, no background
    - bold: large yellow text, black outline
    """
    # Write SRT to temp file
    srt_path = str(TEMP_DIR / f"captions_{uuid.uuid4().hex[:8]}.srt")
    with open(srt_path, "w") as f:
        f.write(srt_content)

    style_map = {
        "modern": (
            "FontName=Arial,FontSize=20,PrimaryColour=&H00FFFFFF,"
            "OutlineColour=&H00000000,BackColour=&H80000000,"
            "Bold=1,Outline=2,Shadow=1,MarginV=60"
        ),
        "minimal": (
            "FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,"
            "OutlineColour=&H40000000,Bold=0,Outline=1,Shadow=0,MarginV=50"
        ),
        "bold": (
            "FontName=Impact,FontSize=24,PrimaryColour=&H0000FFFF,"
            "OutlineColour=&H00000000,Bold=1,Outline=3,Shadow=2,MarginV=70"
        ),
    }
    force_style = style_map.get(style, style_map["modern"])

    _run_ffmpeg([
        "-i", video_path,
        "-vf", f"subtitles={srt_path}:force_style='{force_style}'",
        "-c:a", "copy",
        output_path
    ], timeout=120)

    _safe_remove(srt_path)
    return output_path


def generate_clip_srt(segments: list[dict], clip_start: float,
                      clip_end: float) -> str:
    """
    Extract the SRT content for a specific clip time range from full transcript segments.
    Adjusts timestamps to be relative to clip start (0-based).
    """
    srt_lines = []
    idx = 1
    for seg in segments:
        seg_start = seg["start"]
        seg_end = seg["end"]
        # Check overlap with clip range
        if seg_end <= clip_start or seg_start >= clip_end:
            continue
        # Clamp to clip boundaries
        rel_start = max(0, seg_start - clip_start)
        rel_end = min(clip_end - clip_start, seg_end - clip_start)
        srt_lines.append(str(idx))
        srt_lines.append(f"{_fmt_srt(rel_start)} --> {_fmt_srt(rel_end)}")
        srt_lines.append(seg["text"])
        srt_lines.append("")
        idx += 1
    return "\n".join(srt_lines)


# ─────────────────────────────────────────────
# FULL PIPELINE ORCHESTRATOR
# ─────────────────────────────────────────────

async def run_process_pipeline(job_id: str, client_id: str, source_path: str,
                                db_collection, emit_progress) -> dict:
    """
    Run the full Stage 1 pipeline: transcribe → enhance → detect silences → smart cuts.
    Updates job in MongoDB and emits SSE events at each step.
    """
    now = lambda: datetime.now(timezone.utc).isoformat()

    async def update_job(**kwargs):
        await db_collection.update_one(
            {"id": job_id, "clientId": client_id},
            {"$set": {**kwargs, "updatedAt": now()}}
        )

    try:
        # Step 1: Get source info
        await update_job(status="analyzing", step="analyzing")
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "analyzing", "message": "Analyzing source file..."
        })

        duration = _get_duration(source_path)
        video_info = _get_video_info(source_path)
        await update_job(
            sourceDuration=duration,
            sourceWidth=video_info["width"],
            sourceHeight=video_info["height"],
        )

        # Step 2: Transcribe
        await update_job(status="transcribing", step="transcribing")
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "transcribing",
            "message": f"Transcribing {duration/60:.0f}-minute podcast..."
        })

        transcript = await transcribe_podcast(source_path)
        await update_job(
            transcript=transcript["text"],
            transcriptSegments=transcript["segments"],
            srt=transcript["srt"],
            vtt=transcript["vtt"],
            transcriptSegmentCount=transcript.get("segmentCount", 0),
        )

        # Step 3: Enhance audio + video
        await update_job(status="enhancing", step="enhancing")
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "enhancing",
            "message": "Enhancing audio and video quality..."
        })

        enhanced_path = str(TEMP_DIR / f"enhanced_{job_id}.mp4")
        enhance_audio_and_video(source_path, enhanced_path)

        # Upload enhanced version to storage
        from services.storage_service import get_storage_service
        storage = get_storage_service()
        enhanced_key = f"podcast-studio/{client_id}/{job_id}/enhanced.mp4"
        with open(enhanced_path, "rb") as f:
            enhanced_url = await storage.upload_file(
                f.read(), enhanced_key, "video/mp4"
            )
        await update_job(enhancedUrl=enhanced_url)

        # Step 4: Detect silences
        await update_job(status="detecting_silences", step="detecting_silences")
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "detecting_silences",
            "message": "Detecting silences and dead air..."
        })

        silences = detect_silences(enhanced_path)
        await update_job(silences=silences, silenceCount=len(silences))

        # Step 5: AI smart cuts
        await update_job(status="smart_cuts", step="smart_cuts")
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "smart_cuts",
            "message": "AI analyzing cuts for optimal pacing..."
        })

        cuts = await generate_smart_cuts(transcript["text"], silences, duration)
        cut_count = sum(1 for c in cuts if c.get("action") == "cut")
        keep_count = sum(1 for c in cuts if c.get("action") == "keep")
        time_saved = sum(c.get("duration", 0) for c in cuts if c.get("action") == "cut")

        await update_job(
            cuts=cuts,
            cutCount=cut_count,
            keepCount=keep_count,
            timeSavedSeconds=round(time_saved, 1),
            status="cuts_ready",
            step="cuts_ready",
        )

        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "cuts_ready",
            "message": f"Found {cut_count} cuts to remove ({time_saved:.0f}s of dead air)"
        })

        _safe_remove(enhanced_path)
        return {"status": "cuts_ready", "cuts": cuts}

    except Exception as e:
        logger.error(f"Pipeline failed for job {job_id}: {e}")
        await update_job(status="error", error=str(e))
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "error", "message": str(e)
        })
        return {"status": "error", "error": str(e)}


async def run_render_pipeline(job_id: str, client_id: str, job_doc: dict,
                               db_collection, emit_progress) -> dict:
    """
    Render the polished episode with approved cuts applied.
    """
    now = lambda: datetime.now(timezone.utc).isoformat()

    async def update_job(**kwargs):
        await db_collection.update_one(
            {"id": job_id, "clientId": client_id},
            {"$set": {**kwargs, "updatedAt": now()}}
        )

    try:
        await update_job(status="rendering", step="rendering")
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "rendering",
            "message": "Rendering polished episode..."
        })

        # Download enhanced version
        enhanced_url = job_doc.get("enhancedUrl", "")
        source_path = await _download_to_temp(enhanced_url, f"render_src_{job_id}.mp4")
        if not source_path:
            raise RuntimeError("Could not download enhanced source")

        cuts = job_doc.get("cuts", [])
        duration = job_doc.get("sourceDuration", 0)
        polished_path = str(TEMP_DIR / f"polished_{job_id}.mp4")

        render_with_cuts(source_path, cuts, polished_path, duration)

        # Upload polished version
        from services.storage_service import get_storage_service
        storage = get_storage_service()
        polished_key = f"podcast-studio/{client_id}/{job_id}/polished.mp4"
        with open(polished_path, "rb") as f:
            polished_url = await storage.upload_file(
                f.read(), polished_key, "video/mp4"
            )

        polished_duration = _get_duration(polished_path)
        await update_job(
            polishedUrl=polished_url,
            polishedDuration=polished_duration,
            status="polished",
            step="polished",
        )

        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "polished",
            "message": f"Polished episode ready ({polished_duration/60:.1f} min)"
        })

        _safe_remove(source_path)
        _safe_remove(polished_path)
        return {"status": "polished", "polishedUrl": polished_url}

    except Exception as e:
        logger.error(f"Render failed for job {job_id}: {e}")
        await update_job(status="error", error=str(e))
        return {"status": "error", "error": str(e)}


async def run_clip_extraction(job_id: str, client_id: str, job_doc: dict,
                               db_collection, clips_collection,
                               emit_progress) -> dict:
    """
    Stage 2: Detect highlights and generate clips from the polished episode.
    """
    now_fn = lambda: datetime.now(timezone.utc).isoformat()

    async def update_job(**kwargs):
        await db_collection.update_one(
            {"id": job_id, "clientId": client_id},
            {"$set": {**kwargs, "updatedAt": now_fn()}}
        )

    try:
        await update_job(status="detecting_highlights", step="detecting_highlights")
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "detecting_highlights",
            "message": "AI scanning for viral moments..."
        })

        transcript_text = job_doc.get("transcript", "")
        segments = job_doc.get("transcriptSegments", [])
        duration = job_doc.get("polishedDuration", job_doc.get("sourceDuration", 0))

        highlights = await detect_highlights(transcript_text, segments, duration)

        if not highlights:
            await update_job(status="clips_ready", clipCount=0)
            return {"status": "clips_ready", "clips": []}

        # Download polished episode
        polished_url = job_doc.get("polishedUrl") or job_doc.get("enhancedUrl", "")
        source_path = await _download_to_temp(polished_url, f"clip_src_{job_id}.mp4")
        if not source_path:
            raise RuntimeError("Could not download polished source")

        await update_job(status="generating_clips", step="generating_clips")
        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "generating_clips",
            "message": f"Generating {len(highlights)} clips..."
        })

        from services.storage_service import get_storage_service
        storage = get_storage_service()
        generated_clips = []

        for i, highlight in enumerate(highlights):
            clip_id = str(uuid.uuid4())
            clip_start = highlight["start_time"]
            clip_end = highlight["end_time"]
            clip_duration = clip_end - clip_start

            await emit_progress(client_id, "podcast_studio", {
                "jobId": job_id, "step": "generating_clips",
                "message": f"Generating clip {i+1}/{len(highlights)}: {highlight.get('title', '')}"
            })

            # Extract clip
            raw_clip_path = str(TEMP_DIR / f"clip_raw_{clip_id}.mp4")
            extract_clip(source_path, clip_start, clip_duration, raw_clip_path, crop_vertical=True)

            # Generate SRT for this clip
            clip_srt = generate_clip_srt(segments, clip_start, clip_end)

            # Burn captions
            final_clip_path = str(TEMP_DIR / f"clip_final_{clip_id}.mp4")
            if clip_srt.strip():
                burn_captions(raw_clip_path, clip_srt, final_clip_path, style="modern")
            else:
                final_clip_path = raw_clip_path

            # Upload to storage
            clip_key = f"podcast-studio/{client_id}/{job_id}/clips/{clip_id}.mp4"
            with open(final_clip_path, "rb") as f:
                clip_url = await storage.upload_file(
                    f.read(), clip_key, "video/mp4"
                )

            clip_doc = {
                "id": clip_id,
                "jobId": job_id,
                "clientId": client_id,
                "title": highlight.get("title", f"Clip {i+1}"),
                "hook": highlight.get("hook", ""),
                "startTime": clip_start,
                "endTime": clip_end,
                "duration": round(clip_duration, 1),
                "viralityScore": highlight.get("virality_score", 5),
                "reason": highlight.get("reason", ""),
                "tags": highlight.get("tags", []),
                "url": clip_url,
                "srt": clip_srt,
                "captionStyle": "modern",
                "approved": True,  # Default approved, user can reject
                "status": "ready",
                "createdAt": now_fn(),
                "updatedAt": now_fn(),
            }
            await clips_collection.insert_one(clip_doc)
            generated_clips.append(clip_doc)

            # Cleanup temp files
            _safe_remove(raw_clip_path)
            if final_clip_path != raw_clip_path:
                _safe_remove(final_clip_path)

        _safe_remove(source_path)

        await update_job(
            status="clips_ready",
            step="clips_ready",
            clipCount=len(generated_clips),
        )

        await emit_progress(client_id, "podcast_studio", {
            "jobId": job_id, "step": "clips_ready",
            "message": f"{len(generated_clips)} clips ready for review!"
        })

        return {"status": "clips_ready", "clips": generated_clips}

    except Exception as e:
        logger.error(f"Clip extraction failed for job {job_id}: {e}")
        await update_job(status="error", error=str(e))
        return {"status": "error", "error": str(e)}


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def _fmt_srt(secs: float) -> str:
    h = int(secs // 3600)
    m = int((secs % 3600) // 60)
    s = int(secs % 60)
    ms = int((secs - int(secs)) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _fmt_vtt(secs: float) -> str:
    return _fmt_srt(secs).replace(",", ".")


def _fmt_mmss(secs: float) -> str:
    m = int(secs // 60)
    s = int(secs % 60)
    return f"{m}:{s:02d}"


def _safe_remove(path: str):
    try:
        os.remove(path)
    except OSError:
        pass


async def _download_to_temp(url: str, filename: str) -> Optional[str]:
    """Download a URL to a temp file."""
    if not url:
        return None
    path = str(TEMP_DIR / filename)
    try:
        if url.startswith("http"):
            import httpx
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    with open(path, "wb") as f:
                        f.write(resp.content)
                    return path
        elif os.path.exists(url):
            import shutil
            shutil.copy2(url, path)
            return path
    except Exception as e:
        logger.error(f"Download failed: {e}")
    return None
