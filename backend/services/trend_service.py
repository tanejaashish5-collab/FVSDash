"""
Trend Intelligence Service - Sprint 9B
Scans competitors, trending topics, and generates AI recommendations.
"""
import os
import logging
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import uuid
import asyncio

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# Competitor channels to scan
COMPETITOR_CHANNELS = [
    {"name": "Chanakya Inspired", "handle": "@chanakyainspired"},
    {"name": "Chanakya Niti Inspire", "handle": "@chanakyaniti_inspire"},
    {"name": "Dark Niti", "handle": "@darkniti"},
    {"name": "Wake Up World", "handle": "@wakeupworld"},
    {"name": "Vayask Nazariya", "handle": "@vayasknazariya"},
    {"name": "WealthSutra", "handle": "@wealthsutra"},
    {"name": "I Am Sun Tzu", "handle": "@iamsuntzu"},
    {"name": "Machiavelli Mindset", "handle": "@machiavellimindset"},
    {"name": "Alpha Stoic Hub", "handle": "@alphastoichub"},
    {"name": "Capital STOIC", "handle": "@capitalstoic"},
    {"name": "RedFrost Motivation", "handle": "@redfrostmotivation"},
]

TREND_KEYWORDS = [
    "Chanakya niti",
    "Chanakya quotes hindi",
    "dark psychology hindi",
    "dhan niti",
    "kadwi sach",
    "stoicism",
    "mind control hindi",
    "ancient wisdom modern life",
    "enemy strategy",
    "power mindset"
]


def get_youtube_service_api_key():
    """Build YouTube Data API service with API key (for public data)."""
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        # Use OAuth credentials as fallback
        return None
    return build("youtube", "v3", developerKey=api_key, cache_discovery=False)


def get_youtube_service_oauth(access_token: str, refresh_token: str = None):
    """Build YouTube Data API service with OAuth credentials."""
    from google.oauth2.credentials import Credentials
    credentials = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ.get("YOUTUBE_CLIENT_ID"),
        client_secret=os.environ.get("YOUTUBE_CLIENT_SECRET"),
    )
    return build("youtube", "v3", credentials=credentials, cache_discovery=False)


async def scan_competitors(
    db,
    client_id: str,
    access_token: str = None,
    refresh_token: str = None
) -> Dict[str, Any]:
    """
    Scan competitor channels for their top performing Shorts.
    """
    result = {
        "success": False,
        "channelsScanned": 0,
        "videosFound": 0,
        "errors": []
    }
    
    try:
        # Try API key first, then OAuth
        youtube = get_youtube_service_api_key()
        if not youtube and access_token:
            youtube = get_youtube_service_oauth(access_token, refresh_token)
        
        if not youtube:
            result["errors"].append("No YouTube API credentials available")
            result["success"] = True  # Mark as success even with no creds (graceful degradation)
            return result
        
        now = datetime.now(timezone.utc)
        # Use RFC 3339 format without microseconds for YouTube API compatibility
        published_after = (now - timedelta(days=14)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        for competitor in COMPETITOR_CHANNELS:
            try:
                # Search for channel by name/handle
                search_query = competitor.get("name", competitor.get("handle", ""))
                if not search_query:
                    continue
                    
                search_response = youtube.search().list(
                    part="snippet",
                    q=search_query,
                    type="channel",
                    maxResults=1
                ).execute()
                
                if not search_response.get("items"):
                    continue
                
                channel_id = search_response["items"][0]["id"]["channelId"]
                channel_title = search_response["items"][0]["snippet"]["title"]
                
                # Get their recent Shorts (short videos)
                videos_response = youtube.search().list(
                    part="snippet",
                    channelId=channel_id,
                    type="video",
                    videoDuration="short",  # Shorts are "short" duration
                    order="viewCount",
                    publishedAfter=published_after,
                    maxResults=5
                ).execute()
                
                video_ids = [item["id"]["videoId"] for item in videos_response.get("items", [])]
                
                if video_ids:
                    # Get video statistics
                    stats_response = youtube.videos().list(
                        part="statistics,snippet",
                        id=",".join(video_ids)
                    ).execute()
                    
                    for video in stats_response.get("items", []):
                        video_doc = {
                            "id": str(uuid.uuid4()),
                            "clientId": client_id,
                            "competitorName": channel_title,
                            "competitorHandle": competitor.get("handle"),
                            "videoId": video["id"],
                            "title": video["snippet"]["title"],
                            "viewCount": int(video["statistics"].get("viewCount", 0)),
                            "likeCount": int(video["statistics"].get("likeCount", 0)),
                            "publishedAt": video["snippet"]["publishedAt"],
                            "thumbnailUrl": video["snippet"]["thumbnails"].get("high", {}).get("url") or
                                           video["snippet"]["thumbnails"]["default"]["url"],
                            "scannedAt": now.isoformat()
                        }
                        
                        await db.competitor_videos.update_one(
                            {"videoId": video["id"]},
                            {"$set": video_doc},
                            upsert=True
                        )
                        result["videosFound"] += 1
                
                result["channelsScanned"] += 1
                
            except HttpError as e:
                if "quotaExceeded" in str(e):
                    result["errors"].append(f"Quota exceeded while scanning {competitor['name']}")
                    break
                logger.warning(f"Error scanning {competitor['name']}: {e}")
                continue
            
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.5)
        
        result["success"] = True
        return result
        
    except Exception as e:
        logger.exception("Competitor scan error")
        result["errors"].append(str(e))
        return result


async def scan_trending_topics(
    db,
    client_id: str,
    access_token: str = None,
    refresh_token: str = None
) -> Dict[str, Any]:
    """
    Scan trending topics by keyword search.
    """
    result = {
        "success": False,
        "keywordsScanned": 0,
        "videosFound": 0,
        "errors": []
    }
    
    try:
        youtube = get_youtube_service_api_key()
        if not youtube and access_token:
            youtube = get_youtube_service_oauth(access_token, refresh_token)
        
        if not youtube:
            result["errors"].append("No YouTube API credentials available")
            return result
        
        now = datetime.now(timezone.utc)
        # Use RFC 3339 format without microseconds for YouTube API compatibility
        published_after = (now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
        
        for keyword in TREND_KEYWORDS:
            try:
                # Search for trending Shorts with this keyword
                search_response = youtube.search().list(
                    part="snippet",
                    q=keyword,
                    type="video",
                    videoDuration="short",
                    order="viewCount",
                    publishedAfter=published_after,
                    regionCode="IN",  # Focus on India
                    maxResults=3
                ).execute()
                
                video_ids = [item["id"]["videoId"] for item in search_response.get("items", [])]
                
                if video_ids:
                    stats_response = youtube.videos().list(
                        part="statistics,snippet",
                        id=",".join(video_ids)
                    ).execute()
                    
                    for video in stats_response.get("items", []):
                        trend_doc = {
                            "id": str(uuid.uuid4()),
                            "clientId": client_id,
                            "keyword": keyword,
                            "videoId": video["id"],
                            "title": video["snippet"]["title"],
                            "channelName": video["snippet"]["channelTitle"],
                            "viewCount": int(video["statistics"].get("viewCount", 0)),
                            "publishedAt": video["snippet"]["publishedAt"],
                            "thumbnailUrl": video["snippet"]["thumbnails"].get("high", {}).get("url") or
                                           video["snippet"]["thumbnails"]["default"]["url"],
                            "scannedAt": now.isoformat()
                        }
                        
                        await db.trending_topics.update_one(
                            {"videoId": video["id"], "keyword": keyword},
                            {"$set": trend_doc},
                            upsert=True
                        )
                        result["videosFound"] += 1
                
                result["keywordsScanned"] += 1
                
            except HttpError as e:
                if "quotaExceeded" in str(e):
                    result["errors"].append("Quota exceeded")
                    break
                logger.warning(f"Error scanning keyword {keyword}: {e}")
                continue
            
            await asyncio.sleep(0.3)
        
        result["success"] = True
        return result
        
    except Exception as e:
        logger.exception("Trend scan error")
        result["errors"].append(str(e))
        return result


async def generate_recommendations(
    db,
    client_id: str
) -> Dict[str, Any]:
    """
    Generate AI-powered content recommendations using FVS Brain.
    Uses Gemini 2.0 Flash for fast structured JSON output.
    """
    result = {
        "success": False,
        "recommendations": [],
        "error": None
    }
    
    try:
        # Gather inputs for LLM
        # 1. User's top performers
        from services.analytics_service import get_top_performers
        top_performers = await get_top_performers(db, client_id, limit=5)
        
        # 2. Competitor videos (last 14 days)
        competitor_videos = await db.competitor_videos.find(
            {"clientId": client_id},
            {"_id": 0, "competitorName": 1, "title": 1, "viewCount": 1}
        ).sort("viewCount", -1).limit(10).to_list(10)
        
        # 3. Trending topics
        trending = await db.trending_topics.find(
            {"clientId": client_id},
            {"_id": 0, "keyword": 1, "title": 1, "viewCount": 1, "channelName": 1}
        ).sort("viewCount", -1).limit(15).to_list(15)
        
        # Build prompt context
        user_top_str = "\n".join([
            f"- {p.get('title', 'N/A')[:60]} (Views: {p.get('views', 0):,}, CTR: {p.get('ctr', 0)}%, AVD: {p.get('avgViewDurationSeconds', 0)}s)"
            for p in top_performers
        ]) if top_performers else "No analytics data available yet."
        
        competitor_str = "\n".join([
            f"- [{c.get('competitorName', 'Unknown')}] {c.get('title', 'N/A')[:60]} ({c.get('viewCount', 0):,} views)"
            for c in competitor_videos
        ]) if competitor_videos else "No competitor data scanned yet."
        
        trending_str = "\n".join([
            f"- [{t.get('keyword', '')}] {t.get('title', 'N/A')[:60]} by {t.get('channelName', 'Unknown')} ({t.get('viewCount', 0):,} views)"
            for t in trending
        ]) if trending else "No trending data scanned yet."
        
        system_prompt = """You are FVS Brain, the content strategy AI for Chanakya Sutra — a YouTube Shorts channel applying Chanakya's ancient principles to modern money, power, and mindset. The channel posts daily 40-60 second Shorts in Hinglish (Hindi+English mix). No fake quotes. No spiritual fluff. Only actionable frameworks with modern examples.

Channel pillars: Wealth Building (ancient dhan niyam → modern income), Mind Control (focus, discipline), Enemy Strategy (power, politics, psychological defense), Success Formula (step-by-step implementation).

Audience: 89% male, 25-44, Indian urban professionals.

Given the performance data and competitor/trend inputs below, recommend exactly 3 next Shorts. For each, provide:
- title: Hinglish, punchy, under 60 chars
- hook: First 3 seconds script in Hinglish
- angle: What makes this different from competitors
- whyNow: What trend or gap justifies making this this week
- performanceTier: "High" or "Medium" based on similar past performers

Return ONLY a valid JSON array with 3 objects. No markdown, no explanation."""

        user_prompt = f"""YOUR TOP PERFORMING SHORTS:
{user_top_str}

COMPETITOR TOP SHORTS (Last 14 Days):
{competitor_str}

TRENDING TOPICS (Last 7 Days):
{trending_str}

Generate 3 recommendations as JSON array:"""

        # Call Gemini 2.0 Flash via emergentintegrations
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            
            api_key = os.environ.get("EMERGENT_LLM_KEY")
            if not api_key:
                result["error"] = "EMERGENT_LLM_KEY not configured"
                return result
            
            chat = LlmChat(
                api_key=api_key,
                session_id=str(uuid.uuid4()),
                system_message=system_prompt
            ).with_model("gemini", "gemini-2.0-flash")
            
            response_obj = await asyncio.wait_for(
                chat.send_message(UserMessage(text=user_prompt)),
                timeout=30.0
            )
            response = response_obj if isinstance(response_obj, str) else str(response_obj)
            
            # Parse JSON response
            response_text = response.strip()
            # Clean up response if needed
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            recommendations = json.loads(response_text.strip())
            
            if not isinstance(recommendations, list):
                recommendations = [recommendations]
            
            result["recommendations"] = recommendations[:3]
            
        except asyncio.TimeoutError:
            result["error"] = "Brain is thinking... check back in a moment"
            return result
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            result["error"] = "Failed to parse recommendations"
            return result
        except Exception as e:
            logger.exception("LLM error")
            result["error"] = str(e)
            return result
        
        # Store recommendations
        now = datetime.now(timezone.utc)
        rec_doc = {
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "recommendations": result["recommendations"],
            "generatedAt": now.isoformat(),
            "inputContext": {
                "topPerformersCount": len(top_performers),
                "competitorVideosCount": len(competitor_videos),
                "trendingTopicsCount": len(trending)
            }
        }
        
        await db.fvs_recommendations.insert_one(rec_doc)
        
        result["success"] = True
        return result
        
    except Exception as e:
        logger.exception("Recommendation generation error")
        result["error"] = str(e)
        return result


async def get_latest_recommendations(db, client_id: str) -> Optional[Dict[str, Any]]:
    """Get the latest recommendations for a user."""
    rec = await db.fvs_recommendations.find_one(
        {"clientId": client_id},
        {"_id": 0},
        sort=[("generatedAt", -1)]
    )
    return rec


async def get_competitor_videos(db, client_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get competitor videos sorted by view count."""
    videos = await db.competitor_videos.find(
        {"clientId": client_id},
        {"_id": 0}
    ).sort("viewCount", -1).limit(limit).to_list(limit)
    return videos


async def get_trending_topics(db, client_id: str) -> List[Dict[str, Any]]:
    """Get trending topics grouped by keyword."""
    topics = await db.trending_topics.find(
        {"clientId": client_id},
        {"_id": 0}
    ).sort("viewCount", -1).to_list(100)
    return topics
