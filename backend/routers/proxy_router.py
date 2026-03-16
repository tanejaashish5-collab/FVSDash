"""
Video Proxy Router
Proxies Google Veo video URLs to bypass CORS restrictions
"""

import os
import logging
import requests
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/proxy", tags=["proxy"])


@router.get("/video")
async def proxy_video(url: str):
    """
    Proxy video from Google Veo to bypass CORS.
    The URL should be a Google generativelanguage.googleapis.com URL.
    """
    try:
        # Validate it's a Google video URL
        parsed = urlparse(url)
        if "googleapis.com" not in parsed.netloc:
            raise HTTPException(status_code=400, detail="Invalid video URL")

        # Get API key for authentication
        api_key = os.environ.get("VEO_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Video API key not configured")

        # Add API key to the request
        headers = {
            "Authorization": f"Bearer {api_key}",
            "User-Agent": "ForgeVoice-Studio/1.0"
        }

        # Stream the video
        response = requests.get(url, headers=headers, stream=True)

        if response.status_code == 404:
            # Try with API key as query parameter instead
            separator = "&" if "?" in url else "?"
            url_with_key = f"{url}{separator}key={api_key}"
            response = requests.get(url_with_key, stream=True)

        if response.status_code != 200:
            logger.error(f"Failed to proxy video: {response.status_code}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to fetch video: {response.status_code}"
            )

        # Get content type
        content_type = response.headers.get("Content-Type", "video/mp4")

        # Stream the response
        def generate():
            for chunk in response.iter_content(chunk_size=8192):
                yield chunk

        return StreamingResponse(
            generate(),
            media_type=content_type,
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Video proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))