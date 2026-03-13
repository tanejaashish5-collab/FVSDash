"""
Publishing Scheduler Service.

Background scheduler that processes scheduled publishing tasks.
Uses APScheduler to check for tasks due to be posted and mock-executes them.
"""
import asyncio
import logging
from datetime import datetime, timezone
import uuid

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from db.mongo import publishing_tasks_collection, platform_connections_collection

logger = logging.getLogger(__name__)

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
    
    _scheduler = AsyncIOScheduler()
    
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

    # Chanakya Sutra daily content generation at 8 AM UTC (1:30 PM IST)
    _scheduler.add_job(
        chanakya_daily_content,
        trigger=CronTrigger(hour=8, minute=0),
        id="chanakya_daily_content",
        name="Chanakya Sutra Daily Auto Content (1 Short + 1 Long)",
        replace_existing=True
    )

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
    logger.info("Chanakya Sutra daily content scheduled at 8 AM UTC (1:30 PM IST)")


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


async def chanakya_daily_content():
    """
    Daily cron: Generate 1 short + 1 long-form for Chanakya Sutra channel.
    Runs at 8 AM UTC (1:30 PM IST).

    Workflow:
    1. Generate 1 short idea → produce short → schedule YouTube Shorts upload (6 PM IST)
    2. Generate 1 long-form idea → produce long-form → schedule YouTube upload (9 AM IST next day)
    """
    from db.mongo import submissions_collection, fvs_ideas_collection
    from services.fvs_service import generate_ideas, produce_episode, generate_script_for_idea, get_channel_profile
    from services.video_production_service import produce_longform

    CLIENT_ID = "chanakya-sutra"  # Your channel's client ID

    logger.info("[Chanakya Daily] Starting content generation...")

    try:
        # ═══════════════════════════════════════════════════════════
        # PART 1: GENERATE SHORT
        # ═══════════════════════════════════════════════════════════
        logger.info("[Chanakya Daily] Generating short idea...")

        short_ideas = await generate_ideas(
            client_id=CLIENT_ID,
            target_format="short",
            count=1
        )

        if not short_ideas:
            logger.error("[Chanakya Daily] No short ideas generated!")
        else:
            short_idea = short_ideas[0]
            logger.info(f"[Chanakya Daily] Producing short: '{short_idea['topic']}'")

            try:
                short_result = await produce_episode(
                    client_id=CLIENT_ID,
                    idea_id=short_idea["id"],
                    mode="full_auto_short"
                )

                # Schedule short to post at 6 PM IST (12:30 PM UTC)
                # TODO: Wire to YouTube Shorts API scheduler
                # await schedule_youtube_upload(
                #     submission_id=short_result["submission"]["id"],
                #     scheduled_at="today 12:30 UTC",
                #     platform="youtube_shorts"
                # )

                logger.info(f"[Chanakya Daily] ✅ Short completed: {short_result['submission']['title']}")

            except Exception as e:
                logger.exception(f"[Chanakya Daily] ❌ Short production failed: {e}")

        # ═══════════════════════════════════════════════════════════
        # PART 2: GENERATE LONG-FORM
        # ═══════════════════════════════════════════════════════════
        logger.info("[Chanakya Daily] Generating long-form idea...")

        long_ideas = await generate_ideas(
            client_id=CLIENT_ID,
            target_format="longform",
            count=1
        )

        if not long_ideas:
            logger.error("[Chanakya Daily] No long-form ideas generated!")
        else:
            long_idea = long_ideas[0]
            logger.info(f"[Chanakya Daily] Producing long-form: '{long_idea['topic']}'")

            try:
                # Generate script first
                channel_profile = await get_channel_profile(CLIENT_ID)
                script_data = await generate_script_for_idea(
                    long_idea,
                    brand_voice="Authoritative storyteller, Chanakya wisdom",
                    channel_profile=channel_profile
                )

                # Produce long-form video (uses tiered Kling quality)
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

                # Schedule long-form to post at 9 AM IST next day (3:30 AM UTC)
                # TODO: Wire to YouTube API scheduler
                # await schedule_youtube_upload(
                #     submission_id=submission["id"],
                #     scheduled_at="tomorrow 03:30 UTC",
                #     platform="youtube"
                # )

                logger.info(f"[Chanakya Daily] ✅ Long-form completed: {submission['title']}")

            except Exception as e:
                logger.exception(f"[Chanakya Daily] ❌ Long-form production failed: {e}")

        logger.info("[Chanakya Daily] ✅ Daily content generation complete!")

    except Exception as e:
        logger.exception(f"[Chanakya Daily] ❌ Fatal error: {e}")


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
