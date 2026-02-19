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
    
    _scheduler.start()
    logger.info("Publishing scheduler started (checking every 30 seconds)")


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
