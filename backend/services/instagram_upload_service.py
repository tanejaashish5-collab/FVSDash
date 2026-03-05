"""Instagram Reels upload service — Graph API v21.0."""
import os
import logging
import httpx
import asyncio
from datetime import datetime, timezone, timedelta

from db.mongo import oauth_tokens_collection, publish_jobs_collection

logger = logging.getLogger(__name__)

GRAPH_API = "https://graph.facebook.com/v21.0"


async def get_instagram_credentials(client_id: str) -> dict:
    """Get valid Instagram access token and IG Business Account ID."""
    db = oauth_tokens_collection()
    token = await db.find_one({"clientId": client_id, "platform": "instagram", "connected": True})
    if not token:
        return {"success": False, "error": "Instagram not connected"}

    access_token = token.get("accessToken", "")
    ig_account_id = token.get("accountMeta", {}).get("igBusinessAccountId")

    if access_token.startswith("mock_"):
        return {"success": True, "access_token": access_token, "ig_account_id": "mock_ig_id", "is_mock": True}

    if not ig_account_id:
        return {"success": False, "error": "No Instagram Business Account linked. Ensure your Facebook page has a connected Instagram Business/Creator account."}

    # Check expiry — Instagram long-lived tokens last 60 days
    expires_at = token.get("expiresAt")
    if expires_at:
        expiry = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if expiry < datetime.now(timezone.utc) + timedelta(days=5):
            # Refresh long-lived token
            try:
                async with httpx.AsyncClient() as http:
                    resp = await http.get(
                        "https://graph.instagram.com/refresh_access_token",
                        params={"grant_type": "ig_refresh_token", "access_token": access_token}
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        access_token = data.get("access_token", access_token)
                        new_expires = (datetime.now(timezone.utc) + timedelta(seconds=data.get("expires_in", 5184000))).isoformat()
                        await db.update_one(
                            {"clientId": client_id, "platform": "instagram"},
                            {"$set": {"accessToken": access_token, "expiresAt": new_expires, "updatedAt": datetime.now(timezone.utc).isoformat()}}
                        )
                    else:
                        logger.warning(f"Instagram token refresh failed: {resp.text}")
            except Exception as e:
                logger.error(f"Instagram refresh error: {e}")

    return {"success": True, "access_token": access_token, "ig_account_id": ig_account_id, "is_mock": False}


async def upload_reel_to_instagram(
    client_id: str,
    job_id: str,
    video_url: str,
    caption: str = "",
) -> dict:
    """
    Publish a Reel to Instagram via Graph API.

    Instagram Reels publishing flow:
    1. POST /{ig_user_id}/media — Create media container with video_url
    2. Poll container status until FINISHED
    3. POST /{ig_user_id}/media_publish — Publish the container

    Note: video_url must be a publicly accessible HTTPS URL.
    """
    jobs_db = publish_jobs_collection()
    await jobs_db.update_one({"id": job_id}, {"$set": {"status": "uploading", "progress": 0, "updatedAt": datetime.now(timezone.utc).isoformat()}})

    creds = await get_instagram_credentials(client_id)
    if not creds.get("success"):
        return {"success": False, "error": creds.get("error", "Auth failed"), "error_code": "auth_error"}

    if creds.get("is_mock"):
        import uuid
        mock_id = f"mock_ig_{uuid.uuid4().hex[:12]}"
        return {"success": True, "media_id": mock_id, "url": f"https://www.instagram.com/reel/{mock_id}/", "is_mock": True}

    access_token = creds["access_token"]
    ig_account_id = creds["ig_account_id"]

    try:
        async with httpx.AsyncClient(timeout=300) as http:
            # Step 1: Create Reel media container
            create_resp = await http.post(
                f"{GRAPH_API}/{ig_account_id}/media",
                data={
                    "media_type": "REELS",
                    "video_url": video_url,
                    "caption": caption,
                    "share_to_feed": "true",
                    "access_token": access_token
                }
            )

            if create_resp.status_code != 200:
                error_data = create_resp.json().get("error", {})
                error_msg = error_data.get("message", create_resp.text)
                logger.error(f"Instagram media create failed: {error_msg}")
                return {"success": False, "error": f"Failed to create Reel: {error_msg}", "error_code": "api_error"}

            container_id = create_resp.json().get("id")
            if not container_id:
                return {"success": False, "error": "No container ID returned", "error_code": "api_error"}

            await jobs_db.update_one({"id": job_id}, {"$set": {"progress": 30}})

            # Step 2: Poll container status until FINISHED
            for attempt in range(60):  # Up to 2 minutes
                await asyncio.sleep(2)
                status_resp = await http.get(
                    f"{GRAPH_API}/{container_id}",
                    params={"fields": "status_code,status", "access_token": access_token}
                )
                if status_resp.status_code == 200:
                    status_data = status_resp.json()
                    status_code = status_data.get("status_code")
                    if status_code == "FINISHED":
                        break
                    elif status_code == "ERROR":
                        error_msg = status_data.get("status", "Unknown error during processing")
                        return {"success": False, "error": f"Instagram processing error: {error_msg}", "error_code": "api_error"}

                progress = min(30 + (attempt * 50 // 60), 80)
                await jobs_db.update_one({"id": job_id}, {"$set": {"progress": progress}})
            else:
                return {"success": False, "error": "Instagram processing timed out", "error_code": "timeout"}

            await jobs_db.update_one({"id": job_id}, {"$set": {"progress": 85}})

            # Step 3: Publish the container
            publish_resp = await http.post(
                f"{GRAPH_API}/{ig_account_id}/media_publish",
                data={
                    "creation_id": container_id,
                    "access_token": access_token
                }
            )

            if publish_resp.status_code != 200:
                error_data = publish_resp.json().get("error", {})
                error_msg = error_data.get("message", publish_resp.text)
                return {"success": False, "error": f"Failed to publish Reel: {error_msg}", "error_code": "api_error"}

            media_id = publish_resp.json().get("id")
            await jobs_db.update_one({"id": job_id}, {"$set": {"progress": 100}})

            # Try to get the permalink
            permalink = None
            try:
                link_resp = await http.get(
                    f"{GRAPH_API}/{media_id}",
                    params={"fields": "permalink", "access_token": access_token}
                )
                if link_resp.status_code == 200:
                    permalink = link_resp.json().get("permalink")
            except Exception:
                pass

            return {
                "success": True,
                "media_id": media_id,
                "url": permalink or f"https://www.instagram.com/reel/{media_id}/",
            }

    except Exception as e:
        logger.error(f"Instagram upload error: {e}", exc_info=True)
        return {"success": False, "error": str(e), "error_code": "upload_error"}
