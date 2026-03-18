"""
Publishing Scheduler Service.

Background scheduler that processes scheduled publishing tasks.
Uses APScheduler to check for tasks due to be posted and mock-executes them.
"""
import asyncio
import logging
import os
from datetime import datetime, timezone
import uuid

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from db.mongo import publishing_tasks_collection, platform_connections_collection

logger = logging.getLogger(__name__)


async def _download_video(url: str, day: str, timeout: int = 180) -> str | None:
    """Stream-download a video URL to a temp file. Returns path or None on failure."""
    import httpx
    import tempfile

    tmp_path = None
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as http:
            async with http.stream("GET", url) as resp:
                resp.raise_for_status()

                with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                    tmp_path = tmp.name
                    total = 0
                    async for chunk in resp.aiter_bytes(chunk_size=1024 * 256):
                        tmp.write(chunk)
                        total += len(chunk)

                if total < 10_000:
                    logger.error(f"[Chanakya {day}] Downloaded file too small ({total} bytes) — not a video")
                    _cleanup_temp(tmp_path)
                    return None

                logger.info(f"[Chanakya {day}] Downloaded video: {total} bytes -> {tmp_path}")
                return tmp_path
    except Exception as e:
        logger.error(f"[Chanakya {day}] Video download failed: {e}")
        _cleanup_temp(tmp_path)
        return None


def _cleanup_temp(path: str | None):
    """Safely remove a temp file."""
    if path:
        try:
            os.unlink(path)
        except OSError:
            pass


# Global scheduler instance
_scheduler: AsyncIOScheduler = None


async def process_scheduled_tasks():
    """
    Process all tasks where status=scheduled and scheduled_at <= now.
    Mock-executes them by setting status to posted.
    """
    try:
        db = publishing_tasks_collection()
        conn_db = platform_connections_collection()
        
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        
        # Find tasks that are scheduled and due
        tasks = await db.find({
            "status": "scheduled",
            "scheduledAt": {"$lte": now_iso}
        }, {"_id": 0}).to_list(100)
        
        if not tasks:
            return
        
        logger.info(f"Processing {len(tasks)} scheduled publishing tasks")
        
        for task in tasks:
            task_id = task["id"]
            client_id = task["clientId"]
            platform = task["platform"]
            
            # Check if platform is still connected
            connection = await conn_db.find_one(
                {"clientId": client_id, "platform": platform, "connected": True},
                {"_id": 0}
            )
            
            if not connection:
                # Platform disconnected - mark as failed
                await db.update_one(
                    {"id": task_id},
                    {"$set": {
                        "status": "failed",
                        "errorMessage": "Platform disconnected before scheduled post time",
                        "updatedAt": now_iso
                    }}
                )
                logger.warning(f"Task {task_id} failed: platform {platform} disconnected")
                continue
            
            # Mock posting - simulate success
            mock_post_id = f"mock_{platform}_{uuid.uuid4().hex[:12]}"
            
            await db.update_one(
                {"id": task_id},
                {"$set": {
                    "status": "posted",
                    "postedAt": now_iso,
                    "platformPostId": mock_post_id,
                    "errorMessage": None,
                    "updatedAt": now_iso
                }}
            )
            
            logger.info(f"Task {task_id} posted to {platform} (mock): {mock_post_id}")
    
    except Exception as e:
        logger.error(f"Error processing scheduled tasks: {e}")


def start_scheduler():
    """Start the background scheduler."""
    global _scheduler
    
    if _scheduler is not None:
        logger.warning("Scheduler already running")
        return
    
    _scheduler = AsyncIOScheduler(
        job_defaults={
            "coalesce": True,           # If multiple misfires, run only once
            "misfire_grace_time": 300,   # Accept jobs up to 5 min late (Railway restart)
            "max_instances": 1,          # Never run same job concurrently
        }
    )

    # Run every 30 seconds to check for scheduled tasks
    _scheduler.add_job(
        process_scheduled_tasks,
        trigger=IntervalTrigger(seconds=30),
        id="process_scheduled_publishing",
        name="Process Scheduled Publishing Tasks",
        replace_existing=True
    )
    
    # Daily analytics sync at 6 AM UTC
    from apscheduler.triggers.cron import CronTrigger
    _scheduler.add_job(
        daily_analytics_sync,
        trigger=CronTrigger(hour=6, minute=0),
        id="daily_analytics_sync",
        name="Daily YouTube Analytics Sync",
        replace_existing=True
    )
    
    # Daily trend scan at 7 AM UTC
    _scheduler.add_job(
        daily_trend_scan,
        trigger=CronTrigger(hour=7, minute=0),
        id="daily_trend_scan",
        name="Daily Competitor & Trend Scan",
        replace_existing=True
    )

    # Chanakya Sutra 7x/week content generation
    # 8 PM IST = 2:30 PM UTC (14:30)

    # SHORTS (4x/week): Sat, Mon, Wed, Fri
    logger.info("[Scheduler] Adding Chanakya Saturday Short job...")
    _scheduler.add_job(
        chanakya_short_content,
        trigger=CronTrigger(day_of_week="sat", hour=14, minute=30),
        id="chanakya_saturday_short",
        name="Chanakya Saturday Short",
        replace_existing=True
    )
    logger.info("[Scheduler] ✅ Added Chanakya Saturday Short")

    logger.info("[Scheduler] Adding Chanakya Monday Short job...")
    _scheduler.add_job(
        chanakya_short_content,
        trigger=CronTrigger(day_of_week="mon", hour=14, minute=30),
        id="chanakya_monday_short",
        name="Chanakya Monday Short",
        replace_existing=True
    )
    logger.info("[Scheduler] ✅ Added Chanakya Monday Short")

    logger.info("[Scheduler] Adding Chanakya Wednesday Short job...")
    _scheduler.add_job(
        chanakya_short_content,
        trigger=CronTrigger(day_of_week="wed", hour=14, minute=30),
        id="chanakya_wednesday_short",
        name="Chanakya Wednesday Short",
        replace_existing=True
    )
    logger.info("[Scheduler] ✅ Added Chanakya Wednesday Short")

    logger.info("[Scheduler] Adding Chanakya Friday Short job...")
    _scheduler.add_job(
        chanakya_short_content,
        trigger=CronTrigger(day_of_week="fri", hour=14, minute=30),
        id="chanakya_friday_short",
        name="Chanakya Friday Short",
        replace_existing=True
    )
    logger.info("[Scheduler] ✅ Added Chanakya Friday Short")

    # LONG-FORM (3x/week): Sun, Tue, Thu
    logger.info("[Scheduler] Adding Chanakya Sunday Long-form job...")
    _scheduler.add_job(
        chanakya_longform_content,
        trigger=CronTrigger(day_of_week="sun", hour=14, minute=30),
        id="chanakya_sunday_longform",
        name="Chanakya Sunday Long-form",
        replace_existing=True
    )
    logger.info("[Scheduler] ✅ Added Chanakya Sunday Long-form")

    logger.info("[Scheduler] Adding Chanakya Tuesday Long-form job...")
    _scheduler.add_job(
        chanakya_longform_content,
        trigger=CronTrigger(day_of_week="tue", hour=14, minute=30),
        id="chanakya_tuesday_longform",
        name="Chanakya Tuesday Long-form",
        replace_existing=True
    )
    logger.info("[Scheduler] ✅ Added Chanakya Tuesday Long-form")

    logger.info("[Scheduler] Adding Chanakya Thursday Long-form job...")
    _scheduler.add_job(
        chanakya_longform_content,
        trigger=CronTrigger(day_of_week="thu", hour=14, minute=30),
        id="chanakya_thursday_longform",
        name="Chanakya Thursday Long-form",
        replace_existing=True
    )
    logger.info("[Scheduler] ✅ Added Chanakya Thursday Long-form")

    # Weekly digest every Monday at 08:00 UTC
    from services.email_service import build_and_send_weekly_digests
    _scheduler.add_job(
        build_and_send_weekly_digests,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="weekly_digest",
        name="Weekly Pipeline Digest Email",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("Publishing scheduler started (checking every 30 seconds)")
    logger.info("Daily analytics sync scheduled at 6 AM UTC")
    logger.info("Daily trend scan scheduled at 7 AM UTC")
    logger.info("Chanakya Sutra 7x/week content scheduled at 8 PM IST (2:30 PM UTC):")
    logger.info("  SHORTS (4x): Saturday, Monday, Wednesday, Friday")
    logger.info("  LONG-FORM (3x): Sunday, Tuesday, Thursday")

    # List all registered jobs
    logger.info("[Scheduler] ========== REGISTERED JOBS ==========")
    all_jobs = _scheduler.get_jobs()
    logger.info(f"[Scheduler] Total jobs registered: {len(all_jobs)}")
    for job in all_jobs:
        logger.info(f"[Scheduler]   - {job.id}: {job.name} | Next run: {job.next_run_time}")
    logger.info("[Scheduler] ======================================")


async def daily_analytics_sync():
    """Run daily analytics sync for all connected YouTube accounts."""
    from db.mongo import get_db, oauth_tokens_collection
    from services.analytics_service import sync_channel_analytics
    
    logger.info("Starting daily analytics sync...")
    
    try:
        oauth_db = oauth_tokens_collection()
        db = get_db()
        
        # Get all connected YouTube accounts
        tokens = await oauth_db.find({
            "platform": "youtube",
            "connected": True
        }).to_list(100)
        
        synced = 0
        for token in tokens:
            client_id = token.get("clientId")
            access_token = token.get("accessToken")
            refresh_token = token.get("refreshToken")
            
            if not access_token or access_token.startswith("mock_"):
                continue
            
            try:
                result = await sync_channel_analytics(db, client_id, access_token, refresh_token)
                if result["success"]:
                    synced += 1
                    logger.info(f"Synced analytics for client {client_id}: {result['synced']} videos")
            except Exception as e:
                logger.error(f"Failed to sync analytics for {client_id}: {e}")
        
        logger.info(f"Daily analytics sync complete. Synced {synced} accounts.")
    except Exception as e:
        logger.exception("Daily analytics sync error")


async def daily_trend_scan():
    """Run daily competitor and trend scan for all connected accounts."""
    from db.mongo import get_db, oauth_tokens_collection
    from services.trend_service import scan_competitors, scan_trending_topics, generate_recommendations

    logger.info("Starting daily trend scan...")

    try:
        oauth_db = oauth_tokens_collection()
        db = get_db()

        # Get all connected YouTube accounts
        tokens = await oauth_db.find({
            "platform": "youtube",
            "connected": True
        }).to_list(100)

        scanned = 0
        for token in tokens:
            client_id = token.get("clientId")
            access_token = token.get("accessToken")
            refresh_token = token.get("refreshToken")

            try:
                # Scan competitors
                await scan_competitors(db, client_id, access_token, refresh_token)

                # Scan trending topics
                await scan_trending_topics(db, client_id, access_token, refresh_token)

                # Generate recommendations
                await generate_recommendations(db, client_id)

                scanned += 1
                logger.info(f"Completed trend scan for client {client_id}")
            except Exception as e:
                logger.error(f"Failed trend scan for {client_id}: {e}")

        logger.info(f"Daily trend scan complete. Scanned {scanned} accounts.")
    except Exception as e:
        logger.exception("Daily trend scan error")


async def chanakya_short_content():
    """
    Generate and post a YouTube Short for Chanakya Sutra.
    Runs 4x/week: Sat, Mon, Wed, Fri at 8 PM IST (2:30 PM UTC).
    """
    day = datetime.now(timezone.utc).strftime("%A")
    logger.info(f"[Chanakya {day}] Starting Short generation...")
    await _chanakya_generate_short(day)


async def chanakya_longform_content():
    """
    Generate and post a Long-form video for Chanakya Sutra.
    Runs 3x/week: Sun, Tue, Thu at 8 PM IST (2:30 PM UTC).
    """
    day = datetime.now(timezone.utc).strftime("%A")
    logger.info(f"[Chanakya {day}] Starting Long-form generation...")
    await _chanakya_generate_longform(day)


async def _chanakya_generate_short(day: str):
    """
    Generate and produce 1 YouTube Short for Chanakya Sutra.

    Cost: ~$0.50-1.00 (Veo clips + ElevenLabs voice)
    Duration: 50-60 seconds
    """
    from services.fvs_service import propose_ideas, produce_episode

    CLIENT_ID = "chanakya-sutra"

    logger.info(f"[Chanakya {day}] Generating Short...")

    try:
        result = await propose_ideas(
            client_id=CLIENT_ID,
            format="short",
            range="30d"
        )
        short_ideas = result.get("ideas", [])

        if not short_ideas:
            logger.error(f"[Chanakya {day}] No short ideas generated!")
            return

        short_idea = short_ideas[0]
        logger.info(f"[Chanakya {day}] Producing short: '{short_idea['topic']}'")

        short_result = await produce_episode(
            client_id=CLIENT_ID,
            idea_id=short_idea["id"],
            mode="full_auto_short"
        )

        logger.info(f"[Chanakya {day}] ✅ Short completed: {short_result['submission']['title']}")

        # Auto-post to all connected platforms
        submission_id = short_result["submission"]["id"]
        title = short_idea["topic"]

        logger.info(f"[Chanakya {day}] 🚀 Starting auto-posting to platforms...")

        # Get video URL from assets collection
        from db.mongo import assets_collection
        assets_db = assets_collection()

        # Find the video asset for this submission
        video_asset = await assets_db.find_one({
            "submissionId": submission_id,
            "$or": [
                {"type": "Video"},
                {"assetType": "Video"},
                {"type": "video"},
                {"assetType": "video"}
            ]
        })

        if not video_asset or not video_asset.get("url"):
            logger.error(f"[Chanakya {day}] ❌ No video asset found for submission {submission_id}")
            return

        video_url = video_asset["url"]
        logger.info(f"[Chanakya {day}] Found video asset: {video_asset['id']}")

        # YouTube Shorts
        local_video_path = None
        try:
            from services.youtube_upload_service import upload_video_to_youtube
            import httpx
            import tempfile

            local_video_path = await _download_video(video_url, day)
            if not local_video_path:
                return

            youtube_result = await upload_video_to_youtube(
                user_id=CLIENT_ID,
                job_id=str(uuid.uuid4()),
                video_file_path=local_video_path,
                title=title[:100],
                description=f"{title}\n\nChanakya Niti wisdom for modern leaders.\n\n#Chanakya #Leadership #Business #Strategy #Wisdom",
                tags=["Chanakya", "Leadership", "Business", "Strategy", "Wisdom", "Shorts"],
                category_id="22",
                privacy_status="unlisted"
            )

            if youtube_result.get("success"):
                logger.info(f"[Chanakya {day}] ✅ Posted to YouTube: {youtube_result.get('video_id')}")
                from db.mongo import submissions_collection
                subs_db = submissions_collection()
                await subs_db.update_one(
                    {"id": submission_id},
                    {"$set": {
                        "youtubeVideoId": youtube_result.get('video_id'),
                        "youtubeUrl": youtube_result.get('url'),
                        "status": "PUBLISHED",
                        "updatedAt": datetime.now(timezone.utc).isoformat()
                    }}
                )
            else:
                logger.error(f"[Chanakya {day}] ❌ YouTube upload failed: {youtube_result.get('error')}")

        except Exception as e:
            logger.error(f"[Chanakya {day}] ❌ YouTube upload error: {e}")
        finally:
            _cleanup_temp(local_video_path)

        # TikTok (only if credentials configured)
        if os.environ.get("TIKTOK_CLIENT_KEY"):
            tiktok_video_path = None
            try:
                from services.tiktok_upload_service import upload_video_to_tiktok
                import httpx, tempfile

                tiktok_video_path = await _download_video(video_url, day)
                if tiktok_video_path:
                    tiktok_result = await upload_video_to_tiktok(
                        client_id=CLIENT_ID,
                        job_id=str(uuid.uuid4()),
                        video_file_path=tiktok_video_path,
                        title=title[:150],
                        privacy_level="PUBLIC_TO_EVERYONE"
                    )

                    if tiktok_result.get("success"):
                        logger.info(f"[Chanakya {day}] ✅ Posted to TikTok: {tiktok_result.get('video_id')}")
                    else:
                        logger.error(f"[Chanakya {day}] ❌ TikTok upload failed: {tiktok_result.get('error')}")

            except Exception as e:
                logger.error(f"[Chanakya {day}] ❌ TikTok upload error: {e}")
            finally:
                _cleanup_temp(tiktok_video_path)
        else:
            logger.info(f"[Chanakya {day}] ⏭️  TikTok skipped (no credentials configured)")

        # Instagram Reels
        try:
            from services.instagram_upload_service import upload_reel_to_instagram

            instagram_result = await upload_reel_to_instagram(
                client_id=CLIENT_ID,
                job_id=str(uuid.uuid4()),
                video_url=video_url,  # Instagram can use public URL
                caption=f"{title}\n\n#Chanakya #Leadership #Strategy #Business #Wisdom"[:2200]  # IG caption limit
            )

            if instagram_result.get("success"):
                logger.info(f"[Chanakya {day}] ✅ Posted to Instagram: {instagram_result.get('media_id')}")
            else:
                logger.error(f"[Chanakya {day}] ❌ Instagram upload failed: {instagram_result.get('error')}")

        except Exception as e:
            logger.error(f"[Chanakya {day}] ❌ Instagram upload error: {e}")

        logger.info(f"[Chanakya {day}] 🎉 Auto-posting complete!")

    except Exception as e:
        logger.exception(f"[Chanakya {day}] ❌ Short production failed: {e}")


async def _chanakya_generate_longform(day: str):
    """
    Generate and produce 1 Long-form video for Chanakya Sutra.

    Cost: $2.25 (3 Kling clips × $0.70 + 33 AI images + voice)
    Duration: 6 minutes (360 seconds)
    """
    from db.mongo import submissions_collection, fvs_ideas_collection
    from services.fvs_service import propose_ideas, generate_script_for_idea
    from services.channel_profile_service import get_channel_profile
    from services.video_production_service import produce_longform

    CLIENT_ID = "chanakya-sutra"

    logger.info(f"[Chanakya {day}] Generating Long-form...")

    try:
        result = await propose_ideas(
            client_id=CLIENT_ID,
            format="longform",
            range="30d"
        )
        long_ideas = result.get("ideas", [])

        if not long_ideas:
            logger.error(f"[Chanakya {day}] No long-form ideas generated!")
            return

        long_idea = long_ideas[0]
        logger.info(f"[Chanakya {day}] Producing long-form: '{long_idea['topic']}'")

        # Generate script first
        channel_profile = await get_channel_profile(CLIENT_ID)
        script_data = await generate_script_for_idea(
            long_idea,
            brand_voice="Authoritative storyteller, Chanakya wisdom",
            channel_profile=channel_profile
        )

        # Produce long-form video (3 Kling hero clips + 33 AI images = 6 min)
        long_result = await produce_longform(
            script=script_data["text"],
            title=long_idea["topic"]
        )

        # Create submission record
        now = datetime.now(timezone.utc).isoformat()
        submission = {
            "id": str(uuid.uuid4()),
            "clientId": CLIENT_ID,
            "title": long_idea["topic"],
            "contentType": "Podcast",
            "status": "SCHEDULED",
            "sourceFileUrl": long_result["url"],
            "fvsIdeaId": long_idea["id"],
            "languageStyle": "hinglish",
            "createdAt": now,
            "updatedAt": now
        }

        subs_db = submissions_collection()
        await subs_db.insert_one(submission)

        # Update idea status
        ideas_db = fvs_ideas_collection()
        await ideas_db.update_one(
            {"id": long_idea["id"]},
            {"$set": {"status": "completed", "submissionId": submission["id"]}}
        )

        # Upload to YouTube
        logger.info(f"[Chanakya {day}] Uploading long-form video to YouTube...")
        local_video_path = None
        try:
            from services.youtube_upload_service import upload_video_to_youtube

            local_video_path = await _download_video(long_result["url"], day, timeout=300)
            if not local_video_path:
                return

            youtube_result = await upload_video_to_youtube(
                user_id=CLIENT_ID,
                job_id=str(uuid.uuid4()),
                video_file_path=local_video_path,
                title=long_idea["topic"][:100],
                description=f"{long_idea['topic']}\n\n{script_data['text'][:4500]}\n\n#Chanakya #Leadership #Business #Wisdom #IndianPhilosophy #Strategy",
                tags=["Chanakya", "Leadership", "Business", "Wisdom", "IndianPhilosophy", "Strategy", "Entrepreneurship"],
                category_id="22",
                privacy_status="unlisted"
            )

            if youtube_result.get("success"):
                logger.info(f"[Chanakya {day}] ✅ Long-form uploaded to YouTube: {youtube_result.get('video_id')}")
                await subs_db.update_one(
                    {"id": submission["id"]},
                    {"$set": {
                        "youtubeVideoId": youtube_result.get('video_id'),
                        "youtubeUrl": youtube_result.get('url'),
                        "status": "PUBLISHED",
                        "updatedAt": datetime.now(timezone.utc).isoformat()
                    }}
                )
            else:
                logger.error(f"[Chanakya {day}] ❌ YouTube upload failed: {youtube_result.get('error')}")

        except Exception as e:
            logger.error(f"[Chanakya {day}] ❌ YouTube upload error: {e}")
        finally:
            _cleanup_temp(local_video_path)

        logger.info(f"[Chanakya {day}] ✅ Long-form completed: {submission['title']}")

    except Exception as e:
        logger.exception(f"[Chanakya {day}] ❌ Long-form production failed: {e}")


def stop_scheduler():
    """Stop the background scheduler."""
    global _scheduler
    
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Publishing scheduler stopped")


def get_scheduler() -> AsyncIOScheduler:
    """Get the scheduler instance."""
    return _scheduler
