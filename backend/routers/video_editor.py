"""
Video Editor router.

Provides endpoints for the Video Editor dashboard page:
  - Upload clips, audio tracks, and thumbnails to S3 / local storage
  - CRUD for video editor projects (collections of clips with ordered sequence)
  - Server-side FFmpeg stitching via FastAPI BackgroundTasks

FFmpeg is installed on Railway via nixpacks.toml:
    [phases.setup]
    nixPkgs = ["python311", "ffmpeg", ...]

Storage: uses StorageService (S3 primary, local fallback) — same as the rest of the app.
"""
import io
import os
import uuid
import asyncio
import logging
import tempfile
import subprocess
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Form
from pydantic import BaseModel

from db.mongo import video_editor_projects_collection
from services.auth_service import get_current_user, get_client_id_from_user
from services.storage_service import get_storage_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["video-editor"])

# Maximum upload sizes
MAX_VIDEO_BYTES = 500 * 1024 * 1024   # 500 MB per clip
MAX_AUDIO_BYTES = 50 * 1024 * 1024    # 50 MB audio track
MAX_IMAGE_BYTES = 20 * 1024 * 1024    # 20 MB thumbnail

ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg"}
ALLOWED_AUDIO_TYPES = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/x-m4a"}
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ClipItem(BaseModel):
    id: str
    name: str
    url: str
    order: int
    durationSeconds: Optional[float] = None


class VideoEditorProjectCreate(BaseModel):
    title: str


class VideoEditorProjectUpdate(BaseModel):
    title: Optional[str] = None
    clips: Optional[List[ClipItem]] = None
    audioUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None


# ---------------------------------------------------------------------------
# Upload helpers
# ---------------------------------------------------------------------------

async def _upload_file_to_storage(
    file: UploadFile,
    folder: str,
    max_bytes: int,
    allowed_types: set,
) -> dict:
    """Read, validate, and upload an uploaded file. Returns {url, name, contentType, size}."""
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
            detail=f"File too large ({len(data) // (1024*1024)} MB). Maximum is {max_bytes // (1024*1024)} MB."
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
    """Upload a video clip. Returns {id, url, name, contentType, size}."""
    client_id = get_client_id_from_user(user)
    result = await _upload_file_to_storage(
        file, f"video-editor/{client_id}/clips", MAX_VIDEO_BYTES, ALLOWED_VIDEO_TYPES
    )
    return {"id": str(uuid.uuid4()), **result}


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
    """List all video editor projects for the current client."""
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()
    projects = await db.find(
        {"clientId": client_id}, {"_id": 0}
    ).sort("updatedAt", -1).to_list(50)
    return projects


@router.post("/video-editor/projects")
async def create_project(data: VideoEditorProjectCreate, user: dict = Depends(get_current_user)):
    """Create a new (empty) video editor project."""
    client_id = get_client_id_from_user(user)
    now = datetime.now(timezone.utc).isoformat()
    project = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "title": data.title,
        "clips": [],
        "audioUrl": None,
        "thumbnailUrl": None,
        "stitchedVideoUrl": None,
        "stitchStatus": "idle",   # idle | stitching | ready | failed
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
    """Get a single video editor project."""
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
    """Update project metadata (title, clip order, audio URL, thumbnail URL)."""
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()

    updates: dict = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    if data.title is not None:
        updates["title"] = data.title
    if data.clips is not None:
        # Re-index order to be sequential 0, 1, 2, …
        updates["clips"] = [
            {**c.model_dump(), "order": i} for i, c in enumerate(data.clips)
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
    """Delete a video editor project."""
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()
    result = await db.delete_one({"id": project_id, "clientId": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted"}


# ---------------------------------------------------------------------------
# FFmpeg stitch
# ---------------------------------------------------------------------------

async def _run_ffmpeg_stitch(project_id: str, client_id: str):
    """
    Background task: download clips, stitch with FFmpeg, upload result to storage.

    FFmpeg concat demuxer is used (lossless, no re-encode for same-codec clips).
    If clips have different codecs, ffmpeg auto-selects the best compatible codec.
    """
    db = video_editor_projects_collection()
    project = await db.find_one({"id": project_id, "clientId": client_id}, {"_id": 0})
    if not project:
        logger.error(f"Stitch job: project {project_id} not found")
        return

    clips = sorted(project.get("clips", []), key=lambda c: c.get("order", 0))
    if not clips:
        await db.update_one({"id": project_id}, {"$set": {
            "stitchStatus": "failed",
            "stitchError": "No clips to stitch",
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }})
        return

    import httpx

    with tempfile.TemporaryDirectory() as tmpdir:
        clip_paths: List[str] = []

        # Download each clip
        async with httpx.AsyncClient(timeout=120) as http_client:
            for i, clip in enumerate(clips):
                url = clip.get("url", "")
                if not url:
                    continue
                try:
                    if url.startswith("local://"):
                        # Read from local storage
                        storage = get_storage_service()
                        data = await storage.read_file(url)
                        if data:
                            path = os.path.join(tmpdir, f"clip_{i:03d}.mp4")
                            with open(path, "wb") as f:
                                f.write(data)
                            clip_paths.append(path)
                    else:
                        resp = await http_client.get(url)
                        if resp.status_code == 200:
                            path = os.path.join(tmpdir, f"clip_{i:03d}.mp4")
                            with open(path, "wb") as f:
                                f.write(resp.content)
                            clip_paths.append(path)
                        else:
                            logger.warning(f"Failed to download clip {url}: HTTP {resp.status_code}")
                except Exception as e:
                    logger.error(f"Error downloading clip {url}: {e}")

        if not clip_paths:
            await db.update_one({"id": project_id}, {"$set": {
                "stitchStatus": "failed",
                "stitchError": "Could not download any clips for stitching",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }})
            return

        # Write FFmpeg concat file
        concat_file = os.path.join(tmpdir, "clips.txt")
        with open(concat_file, "w") as f:
            for path in clip_paths:
                f.write(f"file '{path}'\n")

        output_path = os.path.join(tmpdir, "stitched_output.mp4")

        # Run FFmpeg: concat demuxer (fast, no re-encode for same format)
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_file,
            "-c", "copy",            # Copy streams without re-encoding
            output_path
        ]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                # Re-encode fallback: some clips may have incompatible codecs
                logger.warning(f"FFmpeg concat copy failed (rc={proc.returncode}), retrying with re-encode")
                cmd_reencode = [
                    "ffmpeg", "-y",
                    "-f", "concat", "-safe", "0",
                    "-i", concat_file,
                    "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                    "-c:a", "aac", "-b:a", "128k",
                    output_path
                ]
                proc2 = await asyncio.create_subprocess_exec(
                    *cmd_reencode,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout2, stderr2 = await proc2.communicate()
                if proc2.returncode != 0:
                    error_msg = stderr2.decode()[-500:]
                    raise RuntimeError(f"FFmpeg failed: {error_msg}")

        except FileNotFoundError:
            await db.update_one({"id": project_id}, {"$set": {
                "stitchStatus": "failed",
                "stitchError": "FFmpeg not found on server. Check nixpacks.toml configuration.",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }})
            return
        except Exception as e:
            await db.update_one({"id": project_id}, {"$set": {
                "stitchStatus": "failed",
                "stitchError": str(e)[:500],
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }})
            return

        # Upload stitched result to storage
        try:
            with open(output_path, "rb") as f:
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
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }})
            logger.info(f"Stitch complete for project {project_id}: {stitched_url}")

        except Exception as e:
            logger.error(f"Failed to upload stitched video: {e}")
            await db.update_one({"id": project_id}, {"$set": {
                "stitchStatus": "failed",
                "stitchError": f"Upload failed: {str(e)}",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
            }})


@router.post("/video-editor/projects/{project_id}/stitch")
async def stitch_project(
    project_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """
    Start an FFmpeg stitch job for the project's clips.

    The job runs in the background. Poll GET /video-editor/projects/{id}
    and check `stitchStatus` (idle → stitching → ready | failed).
    """
    client_id = get_client_id_from_user(user)
    db = video_editor_projects_collection()

    project = await db.find_one({"id": project_id, "clientId": client_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    clips = project.get("clips", [])
    if not clips:
        raise HTTPException(status_code=400, detail="Add at least one clip before stitching")

    if project.get("stitchStatus") == "stitching":
        return {"message": "Stitch already in progress", "stitchStatus": "stitching"}

    # Mark as stitching
    await db.update_one({"id": project_id}, {"$set": {
        "stitchStatus": "stitching",
        "stitchedVideoUrl": None,
        "stitchError": None,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }})

    # Run FFmpeg in background
    background_tasks.add_task(_run_ffmpeg_stitch, project_id, client_id)

    return {
        "message": "Stitch started. Poll GET /api/video-editor/projects/{id} until stitchStatus == 'ready'.",
        "stitchStatus": "stitching",
        "projectId": project_id,
    }
