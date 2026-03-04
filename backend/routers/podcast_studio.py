"""
Podcast Studio router.

Provides endpoints for the Podcast Studio page:
  Stage 1 (Polish): Upload raw podcast → transcribe → enhance → silence detect → smart cuts → render
  Stage 2 (Clip): AI highlight detection → clip extraction → captioned vertical Shorts
  Publish: Batch publish approved clips to YouTube / TikTok / Instagram
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel

from db.mongo import get_db
from services.auth_service import get_current_user, get_client_id_from_user
from services.storage_service import get_storage_service
from services import event_bus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/podcast-studio", tags=["podcast-studio"])

MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB
ALLOWED_TYPES = {
    "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/mpeg",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/aac", "audio/x-m4a",
}

_now = lambda: datetime.now(timezone.utc).isoformat()


def _jobs_col():
    return get_db().podcast_studio_jobs


def _clips_col():
    return get_db().podcast_clips


# ─────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────

class CutUpdate(BaseModel):
    cuts: list  # [{start, end, duration, action: 'cut'|'keep', reason}]


class ClipUpdate(BaseModel):
    title: Optional[str] = None
    startTime: Optional[float] = None
    endTime: Optional[float] = None
    approved: Optional[bool] = None
    captionStyle: Optional[str] = None


class PublishRequest(BaseModel):
    clipIds: Optional[List[str]] = None  # If None, publish all approved
    platforms: Optional[List[str]] = ["youtube"]
    scheduleDays: Optional[int] = 7  # Spread across N days


# ─────────────────────────────────────────────
# UPLOAD
# ─────────────────────────────────────────────

@router.post("/upload")
async def upload_podcast(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Upload a raw podcast file. Returns job_id for tracking."""
    client_id = get_client_id_from_user(user)

    if file.content_type and file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")

    # Read file
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, f"File too large. Max {MAX_UPLOAD_BYTES // (1024**3)}GB")

    job_id = str(uuid.uuid4())

    # Upload to storage
    storage = get_storage_service()
    ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "mp4"
    source_key = f"podcast-studio/{client_id}/{job_id}/source.{ext}"
    source_url = await storage.upload_file(data, source_key, file.content_type or "video/mp4")

    # Create job document
    job_doc = {
        "id": job_id,
        "clientId": client_id,
        "sourceUrl": source_url,
        "sourceFilename": file.filename,
        "sourceSize": len(data),
        "sourceContentType": file.content_type,
        "status": "uploaded",
        "step": "uploaded",
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    await _jobs_col().insert_one(job_doc)

    return {
        "jobId": job_id,
        "sourceUrl": source_url,
        "sourceSize": len(data),
        "status": "uploaded",
    }


# ─────────────────────────────────────────────
# PROCESS (Stage 1 pipeline)
# ─────────────────────────────────────────────

@router.post("/jobs/{job_id}/process")
async def start_processing(
    job_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Start the Stage 1 pipeline: transcribe → enhance → silence detect → smart cuts."""
    client_id = get_client_id_from_user(user)
    job = await _jobs_col().find_one({"id": job_id, "clientId": client_id})
    if not job:
        raise HTTPException(404, "Job not found")

    if job.get("status") not in ("uploaded", "error", "cuts_ready"):
        raise HTTPException(409, f"Job is already {job.get('status')}")

    # Download source to temp
    source_url = job["sourceUrl"]
    from services.podcast_studio_service import _download_to_temp
    source_path = await _download_to_temp(source_url, f"source_{job_id}.mp4")
    if not source_path:
        raise HTTPException(500, "Could not download source file")

    from services.podcast_studio_service import run_process_pipeline
    background_tasks.add_task(
        run_process_pipeline, job_id, client_id, source_path,
        _jobs_col(), event_bus.emit
    )

    await _jobs_col().update_one(
        {"id": job_id}, {"$set": {"status": "processing", "updatedAt": _now()}}
    )

    return {"jobId": job_id, "status": "processing"}


# ─────────────────────────────────────────────
# JOB STATUS
# ─────────────────────────────────────────────

@router.get("/jobs")
async def list_jobs(user: dict = Depends(get_current_user)):
    """List all podcast studio jobs for this client."""
    client_id = get_client_id_from_user(user)
    cursor = _jobs_col().find(
        {"clientId": client_id},
        {"_id": 0, "transcript": 0, "transcriptSegments": 0, "srt": 0, "vtt": 0}
    ).sort("createdAt", -1).limit(50)
    jobs = await cursor.to_list(length=50)
    return {"jobs": jobs}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str, user: dict = Depends(get_current_user)):
    """Get full job details including transcript and cuts."""
    client_id = get_client_id_from_user(user)
    job = await _jobs_col().find_one({"id": job_id, "clientId": client_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/jobs/{job_id}/transcript")
async def get_transcript(job_id: str, user: dict = Depends(get_current_user)):
    """Get the transcript for a job."""
    client_id = get_client_id_from_user(user)
    job = await _jobs_col().find_one(
        {"id": job_id, "clientId": client_id},
        {"_id": 0, "transcript": 1, "transcriptSegments": 1, "srt": 1, "vtt": 1}
    )
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/jobs/{job_id}/cuts")
async def get_cuts(job_id: str, user: dict = Depends(get_current_user)):
    """Get the AI-suggested cuts for a job."""
    client_id = get_client_id_from_user(user)
    job = await _jobs_col().find_one(
        {"id": job_id, "clientId": client_id},
        {"_id": 0, "cuts": 1, "cutCount": 1, "keepCount": 1,
         "timeSavedSeconds": 1, "silences": 1}
    )
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.patch("/jobs/{job_id}/cuts")
async def update_cuts(
    job_id: str,
    body: CutUpdate,
    user: dict = Depends(get_current_user),
):
    """Update the cut decisions (approve/reject individual cuts)."""
    client_id = get_client_id_from_user(user)
    job = await _jobs_col().find_one({"id": job_id, "clientId": client_id})
    if not job:
        raise HTTPException(404, "Job not found")

    cut_count = sum(1 for c in body.cuts if c.get("action") == "cut")
    keep_count = sum(1 for c in body.cuts if c.get("action") == "keep")
    time_saved = sum(c.get("duration", 0) for c in body.cuts if c.get("action") == "cut")

    await _jobs_col().update_one(
        {"id": job_id, "clientId": client_id},
        {"$set": {
            "cuts": [dict(c) if not isinstance(c, dict) else c for c in body.cuts],
            "cutCount": cut_count,
            "keepCount": keep_count,
            "timeSavedSeconds": round(time_saved, 1),
            "updatedAt": _now(),
        }}
    )
    return {"cutCount": cut_count, "keepCount": keep_count, "timeSavedSeconds": round(time_saved, 1)}


# ─────────────────────────────────────────────
# RENDER POLISHED EPISODE
# ─────────────────────────────────────────────

@router.post("/jobs/{job_id}/render")
async def render_polished(
    job_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Render the polished episode with approved cuts applied."""
    client_id = get_client_id_from_user(user)
    job = await _jobs_col().find_one({"id": job_id, "clientId": client_id})
    if not job:
        raise HTTPException(404, "Job not found")

    if job.get("status") not in ("cuts_ready", "polished", "error"):
        raise HTTPException(409, f"Job must be in cuts_ready state, got {job.get('status')}")

    from services.podcast_studio_service import run_render_pipeline
    background_tasks.add_task(
        run_render_pipeline, job_id, client_id, job,
        _jobs_col(), event_bus.emit
    )

    await _jobs_col().update_one(
        {"id": job_id}, {"$set": {"status": "rendering", "updatedAt": _now()}}
    )
    return {"jobId": job_id, "status": "rendering"}


# ─────────────────────────────────────────────
# CLIP EXTRACTION (Stage 2)
# ─────────────────────────────────────────────

@router.post("/jobs/{job_id}/extract-clips")
async def extract_clips(
    job_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Start Stage 2: AI highlight detection + clip generation."""
    client_id = get_client_id_from_user(user)
    job = await _jobs_col().find_one({"id": job_id, "clientId": client_id})
    if not job:
        raise HTTPException(404, "Job not found")

    if job.get("status") not in ("polished", "clips_ready", "error"):
        raise HTTPException(409, f"Episode must be polished first, got {job.get('status')}")

    from services.podcast_studio_service import run_clip_extraction
    background_tasks.add_task(
        run_clip_extraction, job_id, client_id, job,
        _jobs_col(), _clips_col(), event_bus.emit
    )

    await _jobs_col().update_one(
        {"id": job_id}, {"$set": {"status": "extracting_clips", "updatedAt": _now()}}
    )
    return {"jobId": job_id, "status": "extracting_clips"}


@router.get("/jobs/{job_id}/clips")
async def list_clips(job_id: str, user: dict = Depends(get_current_user)):
    """List all generated clips for a job."""
    client_id = get_client_id_from_user(user)
    cursor = _clips_col().find(
        {"jobId": job_id, "clientId": client_id},
        {"_id": 0}
    ).sort("viralityScore", -1)
    clips = await cursor.to_list(length=100)
    return {"clips": clips}


@router.patch("/clips/{clip_id}")
async def update_clip(
    clip_id: str,
    body: ClipUpdate,
    user: dict = Depends(get_current_user),
):
    """Update a clip's metadata (title, trim, approval, caption style)."""
    client_id = get_client_id_from_user(user)
    clip = await _clips_col().find_one({"id": clip_id, "clientId": client_id})
    if not clip:
        raise HTTPException(404, "Clip not found")

    updates = {"updatedAt": _now()}
    if body.title is not None:
        updates["title"] = body.title
    if body.startTime is not None:
        updates["startTime"] = body.startTime
    if body.endTime is not None:
        updates["endTime"] = body.endTime
    if body.approved is not None:
        updates["approved"] = body.approved
    if body.captionStyle is not None:
        updates["captionStyle"] = body.captionStyle

    await _clips_col().update_one({"id": clip_id}, {"$set": updates})
    return {"clipId": clip_id, "updated": list(updates.keys())}


@router.delete("/clips/{clip_id}")
async def delete_clip(clip_id: str, user: dict = Depends(get_current_user)):
    """Delete a clip."""
    client_id = get_client_id_from_user(user)
    result = await _clips_col().delete_one({"id": clip_id, "clientId": client_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Clip not found")
    return {"deleted": True}


@router.post("/clips/{clip_id}/regenerate")
async def regenerate_clip(
    clip_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Re-render a clip with updated trim/caption settings."""
    client_id = get_client_id_from_user(user)
    clip = await _clips_col().find_one({"id": clip_id, "clientId": client_id})
    if not clip:
        raise HTTPException(404, "Clip not found")

    job = await _jobs_col().find_one({"id": clip["jobId"], "clientId": client_id})
    if not job:
        raise HTTPException(404, "Parent job not found")

    async def _regen():
        from services.podcast_studio_service import (
            extract_clip, burn_captions, generate_clip_srt, _download_to_temp, _safe_remove
        )
        from services.storage_service import get_storage_service

        polished_url = job.get("polishedUrl") or job.get("enhancedUrl", "")
        source_path = await _download_to_temp(polished_url, f"regen_src_{clip_id}.mp4")
        if not source_path:
            return

        segments = job.get("transcriptSegments", [])
        start = clip.get("startTime", 0)
        end = clip.get("endTime", start + 60)
        duration = end - start

        from services.podcast_studio_service import TEMP_DIR
        raw_path = str(TEMP_DIR / f"regen_raw_{clip_id}.mp4")
        extract_clip(source_path, start, duration, raw_path, crop_vertical=True)

        clip_srt = generate_clip_srt(segments, start, end)
        style = clip.get("captionStyle", "modern")

        final_path = str(TEMP_DIR / f"regen_final_{clip_id}.mp4")
        if clip_srt.strip():
            burn_captions(raw_path, clip_srt, final_path, style=style)
        else:
            final_path = raw_path

        storage = get_storage_service()
        clip_key = f"podcast-studio/{client_id}/{clip['jobId']}/clips/{clip_id}.mp4"
        with open(final_path, "rb") as f:
            new_url = await storage.upload_file(f.read(), clip_key, "video/mp4")

        await _clips_col().update_one(
            {"id": clip_id},
            {"$set": {"url": new_url, "duration": round(duration, 1),
                      "srt": clip_srt, "status": "ready", "updatedAt": _now()}}
        )

        _safe_remove(source_path)
        _safe_remove(raw_path)
        if final_path != raw_path:
            _safe_remove(final_path)

    background_tasks.add_task(_regen)
    await _clips_col().update_one({"id": clip_id}, {"$set": {"status": "regenerating"}})
    return {"clipId": clip_id, "status": "regenerating"}


# ─────────────────────────────────────────────
# BATCH PUBLISH
# ─────────────────────────────────────────────

@router.post("/jobs/{job_id}/publish")
async def batch_publish(
    job_id: str,
    body: PublishRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Batch publish approved clips. Creates publish jobs spread across days."""
    client_id = get_client_id_from_user(user)
    job = await _jobs_col().find_one({"id": job_id, "clientId": client_id})
    if not job:
        raise HTTPException(404, "Job not found")

    # Get approved clips
    query = {"jobId": job_id, "clientId": client_id, "approved": True}
    if body.clipIds:
        query["id"] = {"$in": body.clipIds}

    cursor = _clips_col().find(query, {"_id": 0}).sort("viralityScore", -1)
    clips = await cursor.to_list(length=100)

    if not clips:
        raise HTTPException(400, "No approved clips to publish")

    # Create publish jobs using existing publishing infrastructure
    from db.mongo import publish_jobs_collection
    from datetime import timedelta
    publish_col = publish_jobs_collection()

    created_jobs = []
    for i, clip in enumerate(clips):
        # Spread across schedule_days
        day_offset = i % max(body.scheduleDays, 1)
        scheduled_at = datetime.now(timezone.utc) + timedelta(days=day_offset, hours=10)

        pub_job = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "clipId": clip["id"],
            "podcastJobId": job_id,
            "title": clip.get("title", f"Clip {i+1}"),
            "description": clip.get("hook", ""),
            "tags": clip.get("tags", []),
            "videoUrl": clip["url"],
            "platforms": body.platforms or ["youtube"],
            "scheduledAt": scheduled_at.isoformat(),
            "status": "queued",
            "createdAt": _now(),
        }
        await publish_col.insert_one(pub_job)
        created_jobs.append({"jobId": pub_job["id"], "title": pub_job["title"],
                             "scheduledAt": pub_job["scheduledAt"]})

    await _jobs_col().update_one(
        {"id": job_id},
        {"$set": {"publishStatus": "queued", "publishedClipCount": len(created_jobs),
                  "updatedAt": _now()}}
    )

    return {
        "published": len(created_jobs),
        "jobs": created_jobs,
        "scheduleDays": body.scheduleDays,
    }


# ─────────────────────────────────────────────
# DELETE JOB
# ─────────────────────────────────────────────

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: dict = Depends(get_current_user)):
    """Delete a job and all its clips."""
    client_id = get_client_id_from_user(user)
    result = await _jobs_col().delete_one({"id": job_id, "clientId": client_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Job not found")
    await _clips_col().delete_many({"jobId": job_id, "clientId": client_id})
    return {"deleted": True}
