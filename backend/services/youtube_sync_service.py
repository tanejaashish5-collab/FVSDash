"""
YouTube Channel Sync Service (The "Pulse" Engine)
Fetches real channel data, Shorts, and analytics using YouTube Data API v3.
"""
import os
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import uuid

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

logger = logging.getLogger(__name__)

# YouTube API configuration
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

# Scopes needed
YOUTUBE_SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]


def get_youtube_service_with_credentials(access_token: str, refresh_token: str = None):
    """Build YouTube service with OAuth credentials."""
    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get("YOUTUBE_CLIENT_ID"),
        client_secret=os.environ.get("YOUTUBE_CLIENT_SECRET"),
    )
    
    # Refresh if needed
    if credentials.expired and credentials.refresh_token:
        try:
            credentials.refresh(Request())
        except Exception as e:
            logger.error(f"Failed to refresh credentials: {e}")
            raise
    
    return build(
        YOUTUBE_API_SERVICE_NAME,
        YOUTUBE_API_VERSION,
        credentials=credentials,
        cache_discovery=False
    )


async def get_channel_info(youtube) -> Dict[str, Any]:
    """Get the authenticated user's channel info."""
    try:
        request = youtube.channels().list(
            part="snippet,statistics,contentDetails",
            mine=True
        )
        response = request.execute()
        
        if not response.get("items"):
            return None
        
        channel = response["items"][0]
        return {
            "channelId": channel["id"],
            "title": channel["snippet"]["title"],
            "description": channel["snippet"].get("description", ""),
            "customUrl": channel["snippet"].get("customUrl"),
            "thumbnailUrl": channel["snippet"]["thumbnails"]["default"]["url"],
            "subscriberCount": int(channel["statistics"].get("subscriberCount", 0)),
            "viewCount": int(channel["statistics"].get("viewCount", 0)),
            "videoCount": int(channel["statistics"].get("videoCount", 0)),
            "uploadsPlaylistId": channel["contentDetails"]["relatedPlaylists"]["uploads"],
            "publishedAt": channel["snippet"].get("publishedAt"),
        }
    except HttpError as e:
        logger.error(f"Error fetching channel info: {e}")
        raise


async def get_channel_shorts(youtube, uploads_playlist_id: str, max_results: int = 100) -> List[Dict[str, Any]]:
    """Fetch all Shorts from the channel's uploads playlist."""
    shorts = []
    page_token = None
    
    try:
        while True:
            request = youtube.playlistItems().list(
                part="snippet,contentDetails",
                playlistId=uploads_playlist_id,
                maxResults=min(50, max_results - len(shorts)),
                pageToken=page_token
            )
            response = request.execute()
            
            video_ids = [item["contentDetails"]["videoId"] for item in response.get("items", [])]
            
            if video_ids:
                # Get video details to identify Shorts (duration <= 60s)
                videos_request = youtube.videos().list(
                    part="snippet,contentDetails,statistics",
                    id=",".join(video_ids)
                )
                videos_response = videos_request.execute()
                
                for video in videos_response.get("items", []):
                    # Parse duration (ISO 8601 format like PT1M30S)
                    duration_str = video["contentDetails"]["duration"]
                    duration_seconds = parse_iso_duration(duration_str)
                    
                    # Shorts are typically <= 60 seconds and vertical
                    is_short = duration_seconds <= 180  # YouTube Shorts can be up to 3 min now
                    
                    video_data = {
                        "videoId": video["id"],
                        "title": video["snippet"]["title"],
                        "description": video["snippet"].get("description", ""),
                        "thumbnailUrl": video["snippet"]["thumbnails"].get("high", {}).get("url") or 
                                       video["snippet"]["thumbnails"]["default"]["url"],
                        "publishedAt": video["snippet"]["publishedAt"],
                        "durationSeconds": duration_seconds,
                        "isShort": is_short,
                        "viewCount": int(video["statistics"].get("viewCount", 0)),
                        "likeCount": int(video["statistics"].get("likeCount", 0)),
                        "commentCount": int(video["statistics"].get("commentCount", 0)),
                        "tags": video["snippet"].get("tags", []),
                    }
                    
                    if is_short:
                        shorts.append(video_data)
            
            page_token = response.get("nextPageToken")
            if not page_token or len(shorts) >= max_results:
                break
        
        return shorts
        
    except HttpError as e:
        logger.error(f"Error fetching shorts: {e}")
        raise


def parse_iso_duration(duration_str: str) -> int:
    """Parse ISO 8601 duration string to seconds."""
    import re
    
    # Pattern for ISO 8601 duration: PT1H30M45S, PT30S, PT1M, etc.
    pattern = r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?'
    match = re.match(pattern, duration_str)
    
    if not match:
        return 0
    
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    
    return hours * 3600 + minutes * 60 + seconds


async def sync_channel_data(
    db,
    client_id: str,
    access_token: str,
    refresh_token: str = None,
    progress_callback = None
) -> Dict[str, Any]:
    """
    Full channel sync: fetches channel info, Shorts, and creates submissions/assets.
    
    Returns sync result with counts.
    """
    result = {
        "success": False,
        "channelInfo": None,
        "shortsImported": 0,
        "assetsCreated": 0,
        "analyticsUpdated": 0,
        "errors": []
    }
    
    try:
        youtube = get_youtube_service_with_credentials(access_token, refresh_token)
        
        # Step 1: Get channel info
        if progress_callback:
            await progress_callback("Fetching channel info...", 10)
        
        channel_info = await get_channel_info(youtube)
        if not channel_info:
            result["errors"].append("Could not fetch channel info")
            return result
        
        result["channelInfo"] = channel_info
        
        # Update OAuth token record with channel info
        await db.oauth_tokens.update_one(
            {"clientId": client_id, "platform": "youtube"},
            {"$set": {
                "channelId": channel_info["channelId"],
                "accountName": channel_info["title"],
                "accountHandle": channel_info.get("customUrl", f"@{channel_info['title']}"),
                "accountMeta": {
                    "subscriberCount": f"{channel_info['subscriberCount']:,}",
                    "channelId": channel_info["channelId"],
                    "thumbnailUrl": channel_info["thumbnailUrl"]
                },
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Step 2: Fetch all Shorts
        if progress_callback:
            await progress_callback(f"Fetching Shorts from {channel_info['title']}...", 30)
        
        shorts = await get_channel_shorts(youtube, channel_info["uploadsPlaylistId"], max_results=200)
        
        if progress_callback:
            await progress_callback(f"Found {len(shorts)} Shorts. Importing...", 50)
        
        # Step 3: Import Shorts as submissions and assets
        submissions_collection = db.submissions
        assets_collection = db.assets
        now = datetime.now(timezone.utc)
        
        for idx, short in enumerate(shorts):
            # Check if already imported
            existing = await submissions_collection.find_one({
                "clientId": client_id,
                "youtubeVideoId": short["videoId"]
            })
            
            if existing:
                # Update stats
                await submissions_collection.update_one(
                    {"id": existing["id"]},
                    {"$set": {
                        "youtubeViewCount": short["viewCount"],
                        "youtubeLikeCount": short["likeCount"],
                        "updatedAt": now.isoformat()
                    }}
                )
                continue
            
            # Create new submission
            submission_id = str(uuid.uuid4())
            published_date = datetime.fromisoformat(short["publishedAt"].replace("Z", "+00:00"))
            
            submission = {
                "id": submission_id,
                "clientId": client_id,
                "title": short["title"][:200],
                "description": short["description"][:1000] if short["description"] else "",
                "contentType": "Short",
                "status": "PUBLISHED",
                "priority": "Medium",
                "releaseDate": published_date.strftime("%Y-%m-%d"),
                "tags": short["tags"][:10] if short["tags"] else [],
                "youtubeVideoId": short["videoId"],
                "youtubeUrl": f"https://youtube.com/shorts/{short['videoId']}",
                "youtubeChannelId": channel_info["channelId"],
                "youtubeThumbnailUrl": short["thumbnailUrl"],
                "youtubeViewCount": short["viewCount"],
                "youtubeLikeCount": short["likeCount"],
                "youtubeCommentCount": short["commentCount"],
                "durationSeconds": short["durationSeconds"],
                "publishedAt": short["publishedAt"],
                "publishingStatus": "published",
                "createdAt": now.isoformat(),
                "updatedAt": now.isoformat(),
                "importedFromYoutube": True
            }
            
            await submissions_collection.insert_one(submission)
            result["shortsImported"] += 1
            
            # Create video asset
            video_asset = {
                "id": str(uuid.uuid4()),
                "clientId": client_id,
                "submissionId": submission_id,
                "type": "video",
                "title": f"{short['title'][:50]} - Video",
                "url": f"https://youtube.com/shorts/{short['videoId']}",
                "thumbnailUrl": short["thumbnailUrl"],
                "duration": short["durationSeconds"],
                "status": "published",
                "youtubeVideoId": short["videoId"],
                "createdAt": now.isoformat()
            }
            await assets_collection.insert_one(video_asset)
            
            # Create thumbnail asset
            thumb_asset = {
                "id": str(uuid.uuid4()),
                "clientId": client_id,
                "submissionId": submission_id,
                "type": "thumbnail",
                "title": f"{short['title'][:50]} - Thumbnail",
                "url": short["thumbnailUrl"],
                "isPrimaryThumbnail": True,
                "youtubeVideoId": short["videoId"],
                "createdAt": now.isoformat()
            }
            await assets_collection.insert_one(thumb_asset)
            result["assetsCreated"] += 2
            
            if progress_callback and idx % 10 == 0:
                progress = 50 + int((idx / len(shorts)) * 40)
                await progress_callback(f"Imported {idx + 1}/{len(shorts)} Shorts...", progress)
        
        # Step 4: Update channel-level analytics snapshot
        if progress_callback:
            await progress_callback("Updating analytics...", 95)
        
        today_str = now.strftime("%Y-%m-%d")
        analytics_snapshot = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "date": today_str,
            "channelId": channel_info["channelId"],
            "subscriberCount": channel_info["subscriberCount"],
            "totalViews": channel_info["viewCount"],
            "videoCount": channel_info["videoCount"],
            "shortsCount": len(shorts),
            "views": sum(s["viewCount"] for s in shorts),
            "likes": sum(s["likeCount"] for s in shorts),
            "roiEstimate": sum(s["viewCount"] for s in shorts) * 0.003,  # Rough CPM estimate
            "createdAt": now.isoformat(),
            "source": "youtube_sync"
        }
        
        # Upsert today's analytics
        await db.analytics_snapshots.update_one(
            {"clientId": client_id, "date": today_str, "source": "youtube_sync"},
            {"$set": analytics_snapshot},
            upsert=True
        )
        result["analyticsUpdated"] = 1
        
        if progress_callback:
            await progress_callback("Sync complete!", 100)
        
        result["success"] = True
        return result
        
    except HttpError as e:
        error_msg = str(e)
        if "quotaExceeded" in error_msg:
            result["errors"].append("YouTube API quota exceeded. Try again tomorrow.")
        elif "forbidden" in error_msg.lower():
            result["errors"].append("Access forbidden. Please reconnect your YouTube account.")
        else:
            result["errors"].append(f"YouTube API error: {error_msg}")
        return result
    except Exception as e:
        logger.exception("Sync error")
        result["errors"].append(f"Unexpected error: {str(e)}")
        return result
