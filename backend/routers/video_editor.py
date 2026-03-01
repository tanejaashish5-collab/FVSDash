"""
Video Editor router.

Provides endpoints for the Video Editor dashboard page:
  - Upload clips, audio tracks, thumbnails, and b-roll to S3 / local storage
  - CRUD for video editor projects (collections of clips with ordered sequence)
  - Server-side FFmpeg stitching via FastAPI BackgroundTasks:
      Phase 1 — Preprocess each clip (apply trim + mute with ffmpeg)
      Phase 2 — Concat preprocessed clips (ffmpeg concat demuxer)
      Phase 2B — Overlay b-roll clips (ffmpeg overlay filter, PiP)
      Phase 3 — Merge uploaded audio track onto stitched video
  - AI metadata generation (title, description, hashtags, tags)
  - Pipeline export (create a Submission from the stitched video)

FFmpeg + ffprobe are installed on Railway via nixpacks.toml:
    [phases.setup]
    nixPkgs = ["python311", "ffmpeg", ...]
"""
import io
import os
import re
import json
import uuid
import asyncio
import logging
import tempfile
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel

from db.mongo import video_editor_projects_collection
from services.auth_service import get_current_user, get_client_id_from_user
from services.storage_service import get_storage_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["video-editor"])

# Upload size limits
MAX_VIDEO_BYTES = 500 * 1024 * 1024   # 500 MB per clip
MAX_AUDIO_BYTES = 50 * 1024 * 1024    # 50 MB audio track
MAX_IMAGE_BYTES = 20 * 1024 * 1024    # 20 MB thumbnail

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"}
ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/x-m4a"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

_now = lambda: datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ClipItem(BaseModel):
    id: str
    name: str
    url: str
    order: int
    duration: Optional[float] = None       # Original clip duration in seconds (from ffprobe)
    trimStart: Optional[float] = None      # Trim start in seconds (None / 0 = from beginning)
    trimEnd: Optional[float] = None        # Trim end in seconds (None = full clip)
    muted: Optional[bool] = False          # Strip audio from this clip at stitch time


class BrollClipItem(BaseModel):
    id: str
    name: str
    url: str
    order: int
    duration: Optional[float] = None
    offsetSeconds: Optional[float] = 0.0  # When b-roll starts relative to main video start
    position: Optional[str] = "top-right"  # top-right | top-left | bottom-right | bottom-left | center
    scale: Optional[float] = 0.35          # Fraction of frame width (0.2–0.6)


class VideoEditorProjectCreate(BaseModel):
    title: str


class VideoEditorProjectUpdate(BaseModel):
    title: Optional[str] = None
    clips: Optional[List[ClipItem]] = None
    brollClips: Optional[List[BrollClipItem]] = None
    audioUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None


class ExportToPipelineRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = ""
    releaseDate: Optional[str] = None   # ISO date string YYYY-MM-DD or None


# ---------------------------------------------------------------------------
# FFprobe helper — get clip duration
# ---------------------------------------------------------------------------

async def _get_clip_duration(file_path: str) -> Optional[float]:
    """Run ffprobe to get video duration in seconds. Returns None on failure."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams", file_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        info = json.loads(stdout.decode())
        for stream in info.get("streams", []):
            if stream.get("codec_type") == "video":
                dur = float(stream.get("duration", 0) or 0)
                return dur if dur > 0 else None
        # No video stream — try container duration
        fmt = info.get("format", {})
        dur = float(fmt.get("duration", 0) or 0)
        return dur if dur > 0 else None
    except Exception as e:
        logger.warning(f"ffprobe failed for {file_path}: {e}")
        return None


# ---------------------------------------------------------------------------
# Storage download helper (handles /api/files/, local://, and https://)
# ---------------------------------------------------------------------------

async def _download_from_storage(url: str, tmpdir: str, filename: str) -> Optional[str]:
    """Download a file from storage URL to tmpdir. Returns local path or None."""
    if not url:
        return None
    out_path = os.path.join(tmpdir, filename)
    try:
        if url.startswith("/api/files/") or url.startswith("local://"):
            storage = get_storage_service()
            data = await storage.read_file(url)
            if data:
                with open(out_path, "wb") as f:
                    f.write(data)
                return out_path
            logger.warning(f"Could not read from local storage: {url}")
            return None
        else:
            import httpx
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    with open(out_path, "wb") as f:
                        f.write(resp.content)
                    return out_path
                logger.warning(f"HTTP download failed {url}: status {resp.status_code}")
                return None
    except Exception as e:
        logger.error(f"Error downloading {url}: {e}")
        return None


# ---------------------------------------------------------------------------
# FFmpeg subprocess runner
# ---------------------------------------------------------------------------

async def _run_ffmpeg(cmd: list, label: str) -> bool:
    """Run an ffmpeg command. Returns True on success, False on failure."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error(f"FFmpeg {label} failed (rc={proc.returncode}): {stderr.decode()[-500:]}")
            return False
        return True
    except FileNotFoundError:
        logger.error("FFmpeg not found. Check nixpacks.toml configuration.")
        raise
    except Exception as e:
        logger.error(f"FFmpeg {label} error: {e}")
        return False


# ---------------------------------------------------------------------------
# Upload helpers
# ---------------------------------------------------------------------------

async def _upload_file_to_storage(
    file: UploadFile,
    folder: str,
    max_bytes: int,
    allowed_types: set,
) -> dict:
    """Read, validate, and upload a file. Returns {url, name, contentType, size}."""
    content_type = file.content_type or "application/octet-stream"
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: {sorted(allowed_types)}"
        )
    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(data) // (1024*1024)} MB). Max is {max_bytes // (1024*1024)} MB."
        )
    if not data:
        raise HTTPException(status_code=400, detail="Empty file received.")
    storage = get_storage_service()
    url = await storage.upload_file(
        file_data=data,
        filename=file.filename or "upload",
        content_type=content_type,
        folder=folder,
    )
    return {"url": url, "name": file.filename or "upload", "contentType": content_type, "size": len(data)}


# ---------------------------------------------------------------------------
# Upload endpoints
# ---------------------------------------------------------------------------

@router.post("/video-editor/upload/clip")
async def upload_video_clip(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a video clip. Returns {id, url, name, contentType, size, duration}."""
    client_id = get_client_id_from_user(user)
    result = await _upload_file_to_storage(
        file, f"video-editor/{client_id}/clips", MAX_VIDEO_BYTES, ALLOWED_VIDEO_TYPES
    )
    # Detect duration via ffprobe
    duration = None
    try:
        storage = get_storage_service()
        file_data = await storage.read_file(result["url"])
        if file_data:
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name
            duration = await _get_clip_duration(tmp_path)
            os.unlink(tmp_path)
    except Exception as e:
        logger.warning(f"Could not detect duration for {result['url']}: {e}")

    return {"id": str(uuid.uuid4()), "duration": duration, **result}


@router.post("/video-editor/upload/broll")
async def upload_broll_clip(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a b-roll clip for picture-in-picture overlay."""
    client_id = get_client_id_from_user(user)
    result = await _upload_file_to_storage(
        file, f"video-editor/{client_id}/broll", MAX_VIDEO_BYTES, ALLOWED_VIDEO_TYPES
    )
    duration = None
    try:
        storage = get_storage_service()
        file_data = await storage.read_file(result["url"])
        if file_data:
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                tmp.write(file_data)
                tmp_path = tmp.name
            duration = await _get_clip_duration(tmp_path)
            os.unlink(tmp_path)
    except Exception as e:
        logger.warning(f"Could not detect duration for b-roll {result['url']}: {e}")
    return {"id": str(uuid.uuid4()), "duration": duration, **result}


@router.post("/video-editor/upload/audio")
async def upload_audio_track(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload an audio track for the video editor."""
    client_id = get_client_id_from_user(user)
    result = await _upload_file_to_storage(
        file, f"video-editor/{client_id}/audio", MAX_AUDIO_BYTES, ALLOWED_AUDIO_TYPES
    )
    return result


@router.post("/video-editor/upload/thumbnail")
async def upload_thumbnail(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a thumbnail image for the video editor."""
    client_id = get_client_id_from_user(user)
    result = await _upload_file_to_storage(
        file, f"video-editor/{client_id}/thumbnails", MAX_IMAGE_BYTES, ALLOWED_IMAGE_TYPES
    )
    return result


# ---------------------------------------------------------------------------
# Project CRUD
# ---------------------------------------------------------------------------

@router.get("/video-editor/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()
    return await db.find({"clientId": client_id}, {"_id": 0}).sort("updatedAt", -1).to_list(50)


@router.post("/video-editor/projects")
async def create_project(data: VideoEditorProjectCreate, user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    now = _now()
    project = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "title": data.title,
        "clips": [],
        "brollClips": [],
        "audioUrl": None,
        "thumbnailUrl": None,
        "stitchedVideoUrl": None,
        "stitchStatus": "idle",
        "stitchError": None,
        "createdAt": now,
        "updatedAt": now,
    }
    db = video_editor_projects_collection()
    await db.insert_one(project)
    project.pop("_id", None)
    return project


@router.get("/video-editor/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()
    project = await db.find_one({"id": project_id, "clientId": client_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.patch("/video-editor/projects/{project_id}")
async def update_project(
    project_id: str,
    data: VideoEditorProjectUpdate,
    user: dict = Depends(get_current_user),
):
    """Update project metadata (title, clips, brollClips, audioUrl, thumbnailUrl)."""
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()

    updates: dict = {"updatedAt": _now()}
    if data.title is not None:
        updates["title"] = data.title
    if data.clips is not None:
        updates["clips"] = [
            {**c.model_dump(), "order": i} for i, c in enumerate(data.clips)
        ]
    if data.brollClips is not None:
        updates["brollClips"] = [
            {**c.model_dump(), "order": i} for i, c in enumerate(data.brollClips)
        ]
    if data.audioUrl is not None:
        updates["audioUrl"] = data.audioUrl
    if data.thumbnailUrl is not None:
        updates["thumbnailUrl"] = data.thumbnailUrl

    result = await db.update_one(
        {"id": project_id, "clientId": client_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return await db.find_one({"id": project_id}, {"_id": 0})


@router.delete("/video-editor/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()
    result = await db.delete_one({"id": project_id, "clientId": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}


# ---------------------------------------------------------------------------
# FFmpeg stitch — 3-phase pipeline
# ---------------------------------------------------------------------------

async def _run_ffmpeg_stitch(project_id: str, client_id: str):
    """
    Background task: full FFmpeg pipeline.

    Phase 1 — Preprocess each main clip: apply trim (-ss/-t) and mute (-an)
    Phase 2 — Concat preprocessed clips (concat demuxer, copy streams)
    Phase 2B — Apply b-roll overlays (filter_complex overlay, PiP)
    Phase 3 — Overlay uploaded audio track onto final video (-map)
    """
    db = video_editor_projects_collection()
    project = await db.find_one({"id": project_id, "clientId": client_id}, {"_id": 0})
    if not project:
        logger.error(f"Stitch: project {project_id} not found")
        return

    async def _fail(msg: str):
        await db.update_one({"id": project_id}, {"$set": {
            "stitchStatus": "failed",
            "stitchError": msg[:500],
            "updatedAt": _now(),
        }})

    clips = sorted(project.get("clips", []), key=lambda c: c.get("order", 0))
    if not clips:
        await _fail("No clips to stitch"); return

    with tempfile.TemporaryDirectory() as tmpdir:

        # ── Phase 1: Preprocess clips (trim + mute) ──────────────────────────
        preprocessed: List[str] = []
        for i, clip in enumerate(clips):
            url = clip.get("url", "")
            if not url:
                continue

            raw = await _download_from_storage(url, tmpdir, f"raw_{i:03d}.mp4")
            if not raw:
                logger.warning(f"Could not download clip {i}: {url}")
                continue

            trim_start = float(clip.get("trimStart") or 0)
            trim_end = clip.get("trimEnd")         # None = full clip
            muted = bool(clip.get("muted", False))

            pre = os.path.join(tmpdir, f"pre_{i:03d}.mp4")
            cmd = ["ffmpeg", "-y"]
            if trim_start > 0:
                cmd += ["-ss", str(trim_start)]
            cmd += ["-i", raw]
            if trim_end is not None and float(trim_end) > trim_start:
                cmd += ["-t", str(float(trim_end) - trim_start)]
            if muted:
                cmd += ["-an"]
            else:
                cmd += ["-c:a", "aac", "-b:a", "128k"]
            cmd += ["-c:v", "libx264", "-preset", "fast", "-crf", "23", pre]

            if not await _run_ffmpeg(cmd, f"preprocess clip {i}"):
                # Fallback: use raw clip unchanged
                logger.warning(f"Preprocess failed for clip {i}, using raw clip")
                pre = raw

            preprocessed.append(pre)

        if not preprocessed:
            await _fail("Could not download any clips for stitching"); return

        # ── Phase 2: Concat preprocessed clips ───────────────────────────────
        concat_list = os.path.join(tmpdir, "clips.txt")
        with open(concat_list, "w") as f:
            for p in preprocessed:
                f.write(f"file '{p}'\n")

        concat_out = os.path.join(tmpdir, "concat.mp4")
        try:
            ok = await _run_ffmpeg([
                "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                "-i", concat_list, "-c", "copy", concat_out,
            ], "concat-copy")
            if not ok:
                # Re-encode fallback
                ok = await _run_ffmpeg([
                    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", concat_list,
                    "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,"
                           "pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-c:a", "aac", "-b:a", "128k",
                    concat_out,
                ], "concat-reencode")
                if not ok:
                    await _fail("FFmpeg concat failed — check clip formats"); return
        except FileNotFoundError:
            await _fail("FFmpeg not found on server. Check nixpacks.toml."); return

        current = concat_out  # track current output file through each phase

        # ── Phase 2B: B-roll overlays (PiP) ──────────────────────────────────
        broll_clips = sorted(project.get("brollClips", []), key=lambda c: c.get("order", 0))
        if broll_clips:
            # Position table for FFmpeg overlay (W/H = main frame, w/h = overlay size)
            pos_map = {
                "top-right":    "W-w-20:20",
                "top-left":     "20:20",
                "bottom-right": "W-w-20:H-h-20",
                "bottom-left":  "20:H-h-20",
                "center":       "(W-w)/2:(H-h)/2",
            }
            # Build a single ffmpeg command with all b-roll overlays chained
            cmd = ["ffmpeg", "-y", "-i", current]
            broll_paths = []
            valid_brolls = []

            for i, br in enumerate(broll_clips):
                url = br.get("url", "")
                path = await _download_from_storage(url, tmpdir, f"broll_{i:03d}.mp4")
                if path:
                    cmd += ["-i", path]
                    broll_paths.append(path)
                    valid_brolls.append(br)

            if broll_paths:
                filters = []
                last_label = "[0:v]"
                for j, br in enumerate(valid_brolls):
                    scale = float(br.get("scale", 0.35))
                    pos = pos_map.get(br.get("position", "top-right"), "W-w-20:20")
                    offset = float(br.get("offsetSeconds") or 0)
                    br_dur = float(br.get("duration") or 9999)
                    end_t = offset + br_dur
                    new_label = f"[v{j+1}]"
                    idx = j + 1  # ffmpeg input index (0 = main)
                    filters.append(
                        f"[{idx}:v]scale=iw*{scale}:-2[bscaled{j}];"
                        f"{last_label}[bscaled{j}]overlay={pos}:"
                        f"enable='between(t,{offset},{end_t})'{new_label}"
                    )
                    last_label = new_label

                broll_out = os.path.join(tmpdir, "broll_out.mp4")
                cmd += [
                    "-filter_complex", ";".join(filters),
                    "-map", last_label,
                    "-map", "0:a?",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-c:a", "aac", "-b:a", "128k",
                    broll_out,
                ]
                if await _run_ffmpeg(cmd, "broll-overlay"):
                    current = broll_out
                else:
                    logger.warning("B-roll overlay failed, continuing without b-roll")

        # ── Phase 3: Audio track overlay ──────────────────────────────────────
        audio_url = project.get("audioUrl", "")
        if audio_url:
            audio_path = await _download_from_storage(audio_url, tmpdir, "audio_track.audio")
            if audio_path:
                final_out = os.path.join(tmpdir, "final.mp4")
                ok = await _run_ffmpeg([
                    "ffmpeg", "-y",
                    "-i", current,       # stitched video
                    "-i", audio_path,    # uploaded audio track
                    "-c:v", "copy",      # keep video unchanged
                    "-c:a", "aac", "-b:a", "128k",
                    "-map", "0:v:0",     # video from stitched output
                    "-map", "1:a:0",     # audio from uploaded track
                    "-shortest",         # stop at end of shorter stream
                    final_out,
                ], "audio-overlay")
                if ok:
                    current = final_out
                else:
                    logger.warning("Audio overlay failed, continuing without audio replacement")

        # ── Upload final output ───────────────────────────────────────────────
        try:
            with open(current, "rb") as f:
                video_data = f.read()

            storage = get_storage_service()
            stitched_url = await storage.upload_file(
                file_data=video_data,
                filename=f"stitched-{project_id[:8]}.mp4",
                content_type="video/mp4",
                folder=f"video-editor/{client_id}/stitched",
            )
            await db.update_one({"id": project_id}, {"$set": {
                "stitchedVideoUrl": stitched_url,
                "stitchStatus": "ready",
                "stitchError": None,
                "updatedAt": _now(),
            }})
            logger.info(f"Stitch complete: project={project_id} url={stitched_url}")
        except Exception as e:
            logger.error(f"Upload failed after stitch: {e}")
            await _fail(f"Upload failed: {e}")


@router.post("/video-editor/projects/{project_id}/stitch")
async def stitch_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Start an FFmpeg stitch job. Runs in the background.
    Poll GET /api/video-editor/projects/{id} and check `stitchStatus`.
    """
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()

    project = await db.find_one({"id": project_id, "clientId": client_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.get("clips"):
        raise HTTPException(status_code=400, detail="Add at least one clip before stitching")
    if project.get("stitchStatus") == "stitching":
        return {"message": "Stitch already in progress", "stitchStatus": "stitching"}

    await db.update_one({"id": project_id}, {"$set": {
        "stitchStatus": "stitching",
        "stitchedVideoUrl": None,
        "stitchError": None,
        "updatedAt": _now(),
    }})
    background_tasks.add_task(_run_ffmpeg_stitch, project_id, client_id)
    return {"message": "Stitch started. Poll stitchStatus.", "stitchStatus": "stitching", "projectId": project_id}


# ---------------------------------------------------------------------------
# Metadata generation
# ---------------------------------------------------------------------------

@router.post("/video-editor/projects/{project_id}/generate-metadata")
async def generate_metadata(project_id: str, user: dict = Depends(get_current_user)):
    """
    Generate YouTube-ready metadata for the project using AI.
    Tries Gemini first, falls back to OpenAI.
    Returns {title, description, hashtags, tags}.
    """
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()
    project = await db.find_one({"id": project_id, "clientId": client_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    title = project.get("title", "Untitled")
    clip_names = [c.get("name", "") for c in project.get("clips", [])[:10]]

    prompt = f"""Generate YouTube metadata for a video project titled: "{title}"
Video clip filenames: {', '.join(clip_names) if clip_names else 'N/A'}

Return ONLY a valid JSON object with these exact fields:
{{
  "title": "Engaging YouTube title under 70 characters",
  "description": "3-paragraph compelling description with natural keywords",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "tags": ["tag1", "tag2", ...]
}}

Requirements:
- title: Catchy, under 70 characters, no clickbait
- description: 3 paragraphs, natural keyword inclusion, call-to-action in last paragraph
- hashtags: Exactly 15 relevant hashtags WITHOUT the # symbol
- tags: Exactly 20 YouTube keyword tags (mix of short and long-tail)

Return ONLY the JSON object, no markdown, no explanation."""

    raw = None

    # Try Gemini first
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")
    if gemini_key:
        try:
            from services.ai_service import call_gemini
            raw = await call_gemini(prompt, max_tokens=2048)
        except Exception as e:
            logger.warning(f"Gemini metadata generation failed: {e}")

    # Fallback to OpenAI
    if raw is None:
        openai_key = os.environ.get("OPENAI_API_KEY")
        if openai_key:
            try:
                from openai import AsyncOpenAI
                oa = AsyncOpenAI(api_key=openai_key)
                resp = await oa.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=2048,
                )
                raw = resp.choices[0].message.content
            except Exception as e:
                logger.warning(f"OpenAI metadata generation failed: {e}")

    if raw is None:
        raise HTTPException(status_code=503, detail="No AI provider configured (GEMINI_API_KEY or OPENAI_API_KEY required)")

    # Parse JSON from response
    try:
        # Extract JSON block if wrapped in markdown
        match = re.search(r"\{[\s\S]*\}", raw)
        if not match:
            raise ValueError("No JSON object found in AI response")
        data = json.loads(match.group(0))
        return {
            "title": str(data.get("title", title))[:100],
            "description": str(data.get("description", ""))[:3000],
            "hashtags": [str(h).lstrip("#") for h in data.get("hashtags", [])][:20],
            "tags": [str(t) for t in data.get("tags", [])][:30],
        }
    except Exception as e:
        logger.error(f"Failed to parse metadata JSON: {e}\nRaw: {raw[:500]}")
        raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {str(e)}")


# ---------------------------------------------------------------------------
# Pipeline export
# ---------------------------------------------------------------------------

@router.post("/video-editor/projects/{project_id}/export-to-pipeline")
async def export_to_pipeline(
    project_id: str,
    data: ExportToPipelineRequest,
    user: dict = Depends(get_current_user),
):
    """
    Create a Pipeline submission from a stitched video editor project.
    The project must have stitchStatus == 'ready'.
    """
    from db.mongo import submissions_collection
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()

    project = await db.find_one({"id": project_id, "clientId": client_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("stitchStatus") != "ready":
        raise HTTPException(status_code=400, detail="Stitch must be complete (stitchStatus='ready') before exporting")

    title = data.title or project.get("title", "Untitled Video")
    release_date = data.releaseDate  # ISO date string or None

    submission = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "title": title,
        "guest": "",
        "description": data.description or "",
        "contentType": "Short",
        "status": "SCHEDULED" if release_date else "INTAKE",
        "priority": "Medium",
        "releaseDate": release_date,
        "sourceFileUrl": project.get("stitchedVideoUrl"),
        "strategyIdeaId": None,
        "recommendation_id": None,
        "createdAt": _now(),
        "updatedAt": _now(),
    }

    subs_db = submissions_collection()
    await subs_db.insert_one(submission)
    submission.pop("_id", None)

    logger.info(f"Exported video editor project {project_id} → submission {submission['id']}")
    return {"id": submission["id"], "status": submission["status"], "title": title}
