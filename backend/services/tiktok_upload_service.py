"""TikTok upload service — Content Posting API v2."""
import os
import logging
import httpx
from datetime import datetime, timezone, timedelta

from db.mongo import oauth_tokens_collection, publish_jobs_collection

logger = logging.getLogger(__name__)


async def get_tiktok_credentials(client_id: str) -> dict:
    """Get valid TikTok access token, auto-refreshing if expired."""
    db = oauth_tokens_collection()
    token = await db.find_one({"clientId": client_id, "platform": "tiktok", "connected": True})
    if not token:
        return {"success": False, "error": "TikTok not connected"}

    access_token = token.get("accessToken", "")
    if access_token.startswith("mock_"):
        return {"success": True, "access_token": access_token, "is_mock": True}

    # Check expiry and refresh if needed
    expires_at = token.get("expiresAt")
    if expires_at:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expiry < datetime.now(timezone.utc) + timedelta(minutes=5):
            refresh_token = token.get("refreshToken")
            if not refresh_token:
                return {"success": False, "error": "TikTok token expired, no refresh token"}

            try:
                async with httpx.AsyncClient() as http:
                    resp = await http.post(
                        "https://open.tiktokapis.com/v2/oauth/token/",
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                        data={
                            "client_key": os.environ.get("TIKTOK_CLIENT_KEY"),
                            "client_secret": os.environ.get("TIKTOK_CLIENT_SECRET"),
                            "refresh_token": refresh_token,
                            "grant_type": "refresh_token"
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        access_token = data.get("access_token", access_token)
                        new_expires = (datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 86400))).isoformat()
                        update = {"accessToken": access_token, "expiresAt": new_expires, "updatedAt": datetime.now(timezone.utc).isoformat()}
                        if data.get("refresh_token"):
                            update["refreshToken"] = data["refresh_token"]
                        await db.update_one({"clientId": client_id, "platform": "tiktok"}, {"$set": update})
                    else:
                        return {"success": False, "error": "Token refresh failed"}
            except Exception as e:
                return {"success": False, "error": f"Refresh error: {e}"}

    return {"success": True, "access_token": access_token, "is_mock": False}


async def upload_video_to_tiktok(
    client_id: str,
    job_id: str,
    video_file_path: str,
    title: str = "",
    privacy_level: str = "SELF_ONLY",
) -> dict:
    """
    Upload a video to TikTok via Content Posting API v2.

    TikTok upload flow:
    1. POST /v2/post/publish/inbox/video/init/ → get publish_id + upload_url
    2. PUT upload_url with video file bytes
    3. Poll /v2/post/publish/status/ until complete

    privacy_level: SELF_ONLY | MUTUAL_FOLLOW_FRIENDS | FOLLOWER_OF_CREATOR | PUBLIC_TO_EVERYONE
    """
    jobs_db = publish_jobs_collection()
    await jobs_db.update_one({"id": job_id}, {"$set": {"status": "uploading", "progress": 0, "updatedAt": datetime.now(timezone.utc).isoformat()}})

    creds = await get_tiktok_credentials(client_id)
    if not creds.get("success"):
        return {"success": False, "error": creds.get("error", "Auth failed"), "error_code": "auth_error"}

    if creds.get("is_mock"):
        # Mock upload
        import uuid
        mock_id = f"mock_tiktok_{uuid.uuid4().hex[:12]}"
        return {"success": True, "video_id": mock_id, "url": f"https://www.tiktok.com/@user/video/{mock_id}", "is_mock": True}

    access_token = creds["access_token"]

    try:
        # Get file size
        file_size = os.path.getsize(video_file_path)

        async with httpx.AsyncClient(timeout=300) as http:
            # Step 1: Initialize upload
            init_resp = await http.post(
                "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "source_info": {
                        "source": "FILE_UPLOAD",
                        "video_size": file_size,
                        "chunk_size": file_size,
                        "total_chunk_count": 1
                    }
                }
            )

            if init_resp.status_code != 200:
                error_text = init_resp.text
                logger.error(f"TikTok upload init failed: {error_text}")
                return {"success": False, "error": f"Upload init failed: {error_text}", "error_code": "api_error"}

            init_data = init_resp.json().get("data", {})
            publish_id = init_data.get("publish_id")
            upload_url = init_data.get("upload_url")

            if not upload_url:
                return {"success": False, "error": "No upload URL returned", "error_code": "api_error"}

            await jobs_db.update_one({"id": job_id}, {"$set": {"progress": 20}})

            # Step 2: Upload video file
            with open(video_file_path, "rb") as f:
                video_data = f.read()

            upload_resp = await http.put(
                upload_url,
                headers={
                    "Content-Type": "video/mp4",
                    "Content-Range": f"bytes 0-{file_size - 1}/{file_size}"
                },
                content=video_data
            )

            if upload_resp.status_code not in (200, 201):
                logger.error(f"TikTok file upload failed: {upload_resp.text}")
                return {"success": False, "error": "File upload failed", "error_code": "upload_error"}

            await jobs_db.update_one({"id": job_id}, {"$set": {"progress": 80}})

            # Step 3: Poll for publish status
            import asyncio
            for _ in range(30):
                await asyncio.sleep(2)
                status_resp = await http.post(
                    "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json={"publish_id": publish_id}
                )
                if status_resp.status_code == 200:
                    status_data = status_resp.json().get("data", {})
                    publish_status = status_data.get("status")
                    if publish_status == "PUBLISH_COMPLETE":
                        video_id = status_data.get("publicaly_available_post_id", [publish_id])[0] if status_data.get("publicaly_available_post_id") else publish_id
                        await jobs_db.update_one({"id": job_id}, {"$set": {"progress": 100}})
                        return {
                            "success": True,
                            "video_id": str(video_id),
                            "url": f"https://www.tiktok.com/@user/video/{video_id}",
                            "publish_id": publish_id
                        }
                    elif publish_status == "FAILED":
                        fail_reason = status_data.get("fail_reason", "Unknown")
                        return {"success": False, "error": f"TikTok publish failed: {fail_reason}", "error_code": "api_error"}

            return {"success": False, "error": "TikTok publish timed out", "error_code": "timeout"}

    except Exception as e:
        logger.error(f"TikTok upload error: {e}", exc_info=True)
        return {"success": False, "error": str(e), "error_code": "upload_error"}
