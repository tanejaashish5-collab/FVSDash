#!/usr/bin/env python3
"""
Chanakya Video Production - Comprehensive Monitoring and Trigger System

Features:
- Trigger video production (short/long-form) with one command
- Real-time progress tracking with database polling
- Automatic retries for transient failures
- YouTube upload verification
- Alert system for production failures
- Status reporting with detailed logs
- Works locally or on Railway

Usage:
    python monitor_chanakya.py trigger --format short
    python monitor_chanakya.py trigger --format longform
    python monitor_chanakya.py status
    python monitor_chanakya.py check-last --hours 24
    python monitor_chanakya.py retry --submission-id <id>
"""

import os
import sys
import asyncio
import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
import logging

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class ChanakyaMonitor:
    """Comprehensive monitoring and trigger system for Chanakya video production."""

    CLIENT_ID = "chanakya-sutra"
    RETRY_ATTEMPTS = 3
    RETRY_DELAY = 60  # seconds
    POLL_INTERVAL = 15  # seconds
    PRODUCTION_TIMEOUT = 1800  # 30 minutes

    def __init__(self):
        """Initialize monitor with database connections."""
        from dotenv import load_dotenv
        load_dotenv()

        # Verify environment
        self._verify_environment()

        # Import database collections
        from db.mongo import (
            submissions_collection,
            video_tasks_collection,
            fvs_ideas_collection
        )

        self.submissions_db = submissions_collection()
        self.video_tasks_db = video_tasks_collection()
        self.ideas_db = fvs_ideas_collection()

        logger.info("ChanakyaMonitor initialized")

    def _verify_environment(self):
        """Verify all required environment variables are set."""
        required = [
            "MONGO_URL",
            "DB_NAME",
            "FAL_KEY",
            "GEMINI_API_KEY",
            "ELEVENLABS_API_KEY"
        ]

        missing = [key for key in required if not os.getenv(key)]

        if missing:
            logger.error(f"Missing environment variables: {', '.join(missing)}")
            logger.error("Please check your .env file")
            sys.exit(1)

        logger.info("Environment verification passed")

    async def trigger_production(
        self,
        format: str = "short",
        wait: bool = True
    ) -> Dict:
        """
        Trigger Chanakya video production.

        Args:
            format: "short" (50-60s) or "longform" (6 min)
            wait: Wait for production to complete and monitor progress

        Returns:
            Dict with status, submission_id, and details
        """
        logger.info(f"{'='*70}")
        logger.info(f"TRIGGERING CHANAKYA {format.upper()} PRODUCTION")
        logger.info(f"{'='*70}")

        if format not in ("short", "longform"):
            raise ValueError("format must be 'short' or 'longform'")

        # Import production functions
        from services.publishing_scheduler import (
            _chanakya_generate_short,
            _chanakya_generate_longform
        )

        day = datetime.now(timezone.utc).strftime("%A")
        start_time = datetime.now(timezone.utc)

        # Get baseline submission count
        initial_count = await self.submissions_db.count_documents({
            "clientId": self.CLIENT_ID
        })

        logger.info(f"Starting {format} production for {day}")
        logger.info(f"Current submissions count: {initial_count}")
        logger.info(f"Start time: {start_time.isoformat()}")

        # Trigger production (async task)
        try:
            if format == "short":
                asyncio.create_task(_chanakya_generate_short(day))
            else:
                asyncio.create_task(_chanakya_generate_longform(day))

            logger.info(f"Production task created successfully")

            if not wait:
                return {
                    "status": "triggered",
                    "format": format,
                    "message": f"{format.title()} production started. Use 'status' command to monitor."
                }

            # Wait and monitor
            logger.info("Monitoring production progress...")
            result = await self._monitor_production(
                format=format,
                start_time=start_time,
                initial_count=initial_count
            )

            return result

        except Exception as e:
            logger.error(f"Failed to trigger production: {e}")
            import traceback
            traceback.print_exc()

            return {
                "status": "error",
                "error": str(e),
                "message": "Production trigger failed"
            }

    async def _monitor_production(
        self,
        format: str,
        start_time: datetime,
        initial_count: int,
        timeout: int = None
    ) -> Dict:
        """
        Monitor production progress by polling database.

        Args:
            format: "short" or "longform"
            start_time: When production started
            initial_count: Baseline submission count
            timeout: Max seconds to wait (default: self.PRODUCTION_TIMEOUT)

        Returns:
            Dict with status and details
        """
        timeout = timeout or self.PRODUCTION_TIMEOUT
        end_time = start_time + timedelta(seconds=timeout)

        logger.info(f"Monitoring for up to {timeout} seconds...")

        last_idea_count = 0
        last_submission_count = initial_count
        last_video_task_count = 0

        while datetime.now(timezone.utc) < end_time:
            await asyncio.sleep(self.POLL_INTERVAL)

            # Check for new ideas
            ideas_count = await self.ideas_db.count_documents({
                "clientId": self.CLIENT_ID,
                "createdAt": {"$gte": start_time.isoformat()}
            })

            if ideas_count > last_idea_count:
                logger.info(f"[PROGRESS] {ideas_count} idea(s) generated")
                last_idea_count = ideas_count

            # Check for new submissions
            submissions = await self.submissions_db.find({
                "clientId": self.CLIENT_ID,
                "createdAt": {"$gte": start_time.isoformat()}
            }).to_list(10)

            if len(submissions) > last_submission_count - initial_count:
                for sub in submissions[last_submission_count - initial_count:]:
                    logger.info(f"[PROGRESS] Submission created: {sub.get('title', 'Untitled')}")
                    logger.info(f"            ID: {sub['id']}")
                    logger.info(f"            Status: {sub.get('status', 'UNKNOWN')}")

                last_submission_count = initial_count + len(submissions)

            # Check for video tasks
            video_tasks = await self.video_tasks_db.find({
                "clientId": self.CLIENT_ID,
                "createdAt": {"$gte": start_time.isoformat()}
            }).to_list(20)

            if len(video_tasks) > last_video_task_count:
                for task in video_tasks[last_video_task_count:]:
                    logger.info(f"[PROGRESS] Video task: {task.get('status', 'UNKNOWN')}")
                    logger.info(f"            Type: {task.get('taskType', 'unknown')}")
                    logger.info(f"            Provider: {task.get('provider', 'unknown')}")

                last_video_task_count = len(video_tasks)

            # Check if production complete
            if submissions:
                latest_sub = submissions[-1]

                # Check for completion indicators
                has_video_url = latest_sub.get("sourceFileUrl")
                has_youtube_id = latest_sub.get("youtubeVideoId")
                status = latest_sub.get("status", "")

                if has_video_url:
                    elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
                    logger.info(f"{'='*70}")
                    logger.info(f"PRODUCTION COMPLETE!")
                    logger.info(f"{'='*70}")
                    logger.info(f"Time elapsed: {elapsed:.0f} seconds ({elapsed/60:.1f} minutes)")
                    logger.info(f"Submission ID: {latest_sub['id']}")
                    logger.info(f"Title: {latest_sub.get('title', 'Untitled')}")
                    logger.info(f"Video URL: {has_video_url}")
                    logger.info(f"Status: {status}")

                    if has_youtube_id:
                        logger.info(f"YouTube ID: {has_youtube_id}")
                        logger.info(f"YouTube URL: https://youtube.com/watch?v={has_youtube_id}")

                    return {
                        "status": "completed",
                        "submission_id": latest_sub['id'],
                        "title": latest_sub.get('title'),
                        "video_url": has_video_url,
                        "youtube_id": has_youtube_id,
                        "elapsed_seconds": elapsed,
                        "submission": latest_sub
                    }

        # Timeout reached
        logger.warning(f"{'='*70}")
        logger.warning(f"PRODUCTION TIMEOUT")
        logger.warning(f"{'='*70}")
        logger.warning(f"Waited {timeout} seconds without completion")
        logger.warning(f"Last status: {len(submissions)} submission(s), {len(video_tasks)} task(s)")

        return {
            "status": "timeout",
            "message": f"Production did not complete within {timeout} seconds",
            "ideas_generated": last_idea_count,
            "submissions_created": len(submissions),
            "video_tasks_created": len(video_tasks)
        }

    async def check_status(self, hours: int = 24) -> Dict:
        """
        Check status of all Chanakya productions in the last N hours.

        Args:
            hours: Look back this many hours

        Returns:
            Dict with status summary
        """
        logger.info(f"{'='*70}")
        logger.info(f"CHANAKYA STATUS CHECK - LAST {hours} HOURS")
        logger.info(f"{'='*70}")

        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        # Get recent submissions
        submissions = await self.submissions_db.find({
            "clientId": self.CLIENT_ID,
            "createdAt": {"$gte": cutoff.isoformat()}
        }).sort("createdAt", -1).to_list(50)

        logger.info(f"Found {len(submissions)} submission(s)")

        # Categorize by status
        by_status = {}
        completed = []
        failed = []

        for sub in submissions:
            status = sub.get("status", "UNKNOWN")
            by_status[status] = by_status.get(status, 0) + 1

            if sub.get("sourceFileUrl"):
                completed.append(sub)
            elif status == "FAILED":
                failed.append(sub)

        # Print summary
        logger.info(f"\nStatus Summary:")
        for status, count in sorted(by_status.items()):
            logger.info(f"  {status}: {count}")

        # Print completed videos
        if completed:
            logger.info(f"\nCompleted Videos ({len(completed)}):")
            for sub in completed:
                logger.info(f"  - {sub.get('title', 'Untitled')}")
                logger.info(f"    ID: {sub['id']}")
                logger.info(f"    Created: {sub.get('createdAt', 'Unknown')}")
                if sub.get('youtubeVideoId'):
                    logger.info(f"    YouTube: https://youtube.com/watch?v={sub['youtubeVideoId']}")
                logger.info("")

        # Print failures
        if failed:
            logger.info(f"\nFailed Productions ({len(failed)}):")
            for sub in failed:
                logger.info(f"  - {sub.get('title', 'Untitled')}")
                logger.info(f"    ID: {sub['id']}")
                logger.info(f"    Error: {sub.get('errorMessage', 'No error message')}")
                logger.info("")

        return {
            "total": len(submissions),
            "by_status": by_status,
            "completed": len(completed),
            "failed": len(failed),
            "submissions": submissions
        }

    async def retry_failed(self, submission_id: str) -> Dict:
        """
        Retry a failed production.

        Args:
            submission_id: ID of the submission to retry

        Returns:
            Dict with retry status
        """
        logger.info(f"{'='*70}")
        logger.info(f"RETRYING SUBMISSION: {submission_id}")
        logger.info(f"{'='*70}")

        # Get submission
        submission = await self.submissions_db.find_one(
            {"id": submission_id},
            {"_id": 0}
        )

        if not submission:
            logger.error(f"Submission not found: {submission_id}")
            return {
                "status": "error",
                "error": "Submission not found"
            }

        logger.info(f"Found submission: {submission.get('title', 'Untitled')}")
        logger.info(f"Current status: {submission.get('status', 'UNKNOWN')}")

        # Get associated idea
        idea_id = submission.get("fvsIdeaId")
        if not idea_id:
            logger.error("No associated idea found - cannot retry")
            return {
                "status": "error",
                "error": "No associated idea"
            }

        idea = await self.ideas_db.find_one(
            {"id": idea_id},
            {"_id": 0}
        )

        if not idea:
            logger.error(f"Idea not found: {idea_id}")
            return {
                "status": "error",
                "error": "Idea not found"
            }

        logger.info(f"Found idea: {idea.get('topic', 'Untitled')}")

        # Retry production
        try:
            from services.fvs_service import produce_episode

            content_type = submission.get("contentType", "").lower()
            if "short" in content_type or submission.get("duration", 0) < 120:
                mode = "full_auto_short"
            else:
                mode = "full_auto_longform"

            logger.info(f"Retrying with mode: {mode}")

            result = await produce_episode(
                client_id=self.CLIENT_ID,
                idea_id=idea_id,
                mode=mode
            )

            logger.info(f"Retry completed successfully")
            logger.info(f"New submission: {result['submission']['id']}")

            return {
                "status": "completed",
                "original_submission_id": submission_id,
                "new_submission_id": result['submission']['id'],
                "result": result
            }

        except Exception as e:
            logger.error(f"Retry failed: {e}")
            import traceback
            traceback.print_exc()

            return {
                "status": "error",
                "error": str(e)
            }

    async def verify_youtube_upload(self, submission_id: str) -> Dict:
        """
        Verify YouTube upload status for a submission.

        Args:
            submission_id: Submission ID to check

        Returns:
            Dict with YouTube status
        """
        logger.info(f"Verifying YouTube upload for: {submission_id}")

        submission = await self.submissions_db.find_one(
            {"id": submission_id},
            {"_id": 0}
        )

        if not submission:
            return {
                "status": "error",
                "error": "Submission not found"
            }

        youtube_id = submission.get("youtubeVideoId")

        if not youtube_id:
            logger.warning("No YouTube video ID found")
            return {
                "status": "not_uploaded",
                "submission_id": submission_id,
                "title": submission.get("title")
            }

        logger.info(f"YouTube video ID: {youtube_id}")
        logger.info(f"YouTube URL: https://youtube.com/watch?v={youtube_id}")

        # TODO: Could add YouTube API call to verify video exists
        # For now, just check if ID exists in database

        return {
            "status": "uploaded",
            "submission_id": submission_id,
            "youtube_id": youtube_id,
            "youtube_url": f"https://youtube.com/watch?v={youtube_id}",
            "title": submission.get("title")
        }

    async def check_recent_failures(self, hours: int = 24) -> List[Dict]:
        """
        Find all failed productions in the last N hours.

        Args:
            hours: Look back this many hours

        Returns:
            List of failed submissions
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        failures = await self.submissions_db.find({
            "clientId": self.CLIENT_ID,
            "status": "FAILED",
            "createdAt": {"$gte": cutoff.isoformat()}
        }).to_list(50)

        logger.info(f"Found {len(failures)} failure(s) in last {hours} hours")

        for failure in failures:
            logger.info(f"  - {failure.get('title', 'Untitled')}")
            logger.info(f"    ID: {failure['id']}")
            logger.info(f"    Error: {failure.get('errorMessage', 'No error message')}")

        return failures

    async def auto_retry_failures(self, hours: int = 24, max_retries: int = 3) -> Dict:
        """
        Automatically retry all recent failures.

        Args:
            hours: Look back this many hours
            max_retries: Max retry attempts per submission

        Returns:
            Dict with retry results
        """
        logger.info(f"{'='*70}")
        logger.info(f"AUTO-RETRY FAILURES - LAST {hours} HOURS")
        logger.info(f"{'='*70}")

        failures = await self.check_recent_failures(hours)

        if not failures:
            logger.info("No failures to retry")
            return {
                "status": "success",
                "retried": 0,
                "succeeded": 0,
                "failed": 0
            }

        retried = 0
        succeeded = 0
        failed = 0

        for failure in failures:
            # Check if already retried too many times
            retry_count = failure.get("retryCount", 0)
            if retry_count >= max_retries:
                logger.info(f"Skipping {failure['id']} - max retries reached")
                continue

            logger.info(f"Retrying {failure['id']} (attempt {retry_count + 1}/{max_retries})")

            result = await self.retry_failed(failure['id'])
            retried += 1

            if result['status'] == 'completed':
                succeeded += 1
                logger.info(f"✓ Retry succeeded")
            else:
                failed += 1
                logger.error(f"✗ Retry failed: {result.get('error')}")

            # Update retry count
            await self.submissions_db.update_one(
                {"id": failure['id']},
                {"$inc": {"retryCount": 1}}
            )

            # Wait between retries
            if retried < len(failures):
                logger.info(f"Waiting {self.RETRY_DELAY} seconds before next retry...")
                await asyncio.sleep(self.RETRY_DELAY)

        logger.info(f"{'='*70}")
        logger.info(f"AUTO-RETRY COMPLETE")
        logger.info(f"{'='*70}")
        logger.info(f"Total retried: {retried}")
        logger.info(f"Succeeded: {succeeded}")
        logger.info(f"Failed: {failed}")

        return {
            "status": "success",
            "retried": retried,
            "succeeded": succeeded,
            "failed": failed
        }


async def main():
    """Main entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(
        description="Chanakya Video Production Monitor and Trigger System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Trigger short video production
  python monitor_chanakya.py trigger --format short

  # Trigger long-form video production (no waiting)
  python monitor_chanakya.py trigger --format longform --no-wait

  # Check status of last 24 hours
  python monitor_chanakya.py status

  # Check status of last 7 days
  python monitor_chanakya.py status --hours 168

  # Retry a failed submission
  python monitor_chanakya.py retry --submission-id abc123

  # Auto-retry all failures from last 48 hours
  python monitor_chanakya.py auto-retry --hours 48

  # Verify YouTube upload
  python monitor_chanakya.py verify --submission-id abc123
        """
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Trigger command
    trigger_parser = subparsers.add_parser('trigger', help='Trigger video production')
    trigger_parser.add_argument(
        '--format',
        choices=['short', 'longform'],
        default='short',
        help='Video format to produce'
    )
    trigger_parser.add_argument(
        '--no-wait',
        action='store_true',
        help='Do not wait for production to complete'
    )

    # Status command
    status_parser = subparsers.add_parser('status', help='Check production status')
    status_parser.add_argument(
        '--hours',
        type=int,
        default=24,
        help='Check last N hours (default: 24)'
    )

    # Retry command
    retry_parser = subparsers.add_parser('retry', help='Retry a failed submission')
    retry_parser.add_argument(
        '--submission-id',
        required=True,
        help='Submission ID to retry'
    )

    # Auto-retry command
    auto_retry_parser = subparsers.add_parser('auto-retry', help='Auto-retry all failures')
    auto_retry_parser.add_argument(
        '--hours',
        type=int,
        default=24,
        help='Look back N hours (default: 24)'
    )
    auto_retry_parser.add_argument(
        '--max-retries',
        type=int,
        default=3,
        help='Max retry attempts per submission (default: 3)'
    )

    # Verify command
    verify_parser = subparsers.add_parser('verify', help='Verify YouTube upload')
    verify_parser.add_argument(
        '--submission-id',
        required=True,
        help='Submission ID to verify'
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Initialize monitor
    monitor = ChanakyaMonitor()

    # Execute command
    try:
        if args.command == 'trigger':
            result = await monitor.trigger_production(
                format=args.format,
                wait=not args.no_wait
            )

            if result['status'] == 'error':
                logger.error(f"Production failed: {result.get('error')}")
                sys.exit(1)

        elif args.command == 'status':
            result = await monitor.check_status(hours=args.hours)

        elif args.command == 'retry':
            result = await monitor.retry_failed(args.submission_id)

            if result['status'] == 'error':
                logger.error(f"Retry failed: {result.get('error')}")
                sys.exit(1)

        elif args.command == 'auto-retry':
            result = await monitor.auto_retry_failures(
                hours=args.hours,
                max_retries=args.max_retries
            )

        elif args.command == 'verify':
            result = await monitor.verify_youtube_upload(args.submission_id)

            if result['status'] == 'error':
                logger.error(f"Verification failed: {result.get('error')}")
                sys.exit(1)

            if result['status'] == 'not_uploaded':
                logger.warning("Video not yet uploaded to YouTube")
            else:
                logger.info(f"✓ Video uploaded: {result['youtube_url']}")

        logger.info(f"\n{'='*70}")
        logger.info("OPERATION COMPLETE")
        logger.info(f"{'='*70}\n")

    except KeyboardInterrupt:
        logger.info("\nOperation cancelled by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Operation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
