#!/usr/bin/env python3
"""
Live end-to-end test of Chanakya video production with real-time monitoring
"""

import asyncio
import sys
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

MONGO_URL = "mongodb+srv://tanejaashish5_db_user:Atlas007@forgevoice.x0ngmvf.mongodb.net/forgevoice_prod?retryWrites=true&w=majority&appName=ForgeVoice"

async def monitor_production(timeout_minutes=30):
    """
    Monitor production in real-time
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client['forgevoice_prod']
    submissions_coll = db['submissions']
    tasks_coll = db['video_tasks']

    start_time = datetime.now(timezone.utc)
    cutoff_time = start_time - timedelta(minutes=2)

    print("\n📊 MONITORING PRODUCTION...")
    print("=" * 60)

    for i in range(timeout_minutes * 4):  # Check every 15 seconds
        # Check for new submissions
        new_subs = await submissions_coll.find(
            {
                'clientId': 'chanakya-sutra',
                'createdAt': {'$gte': cutoff_time}
            }
        ).sort([('createdAt', -1)]).to_list(10)

        if new_subs:
            for sub in new_subs:
                print(f"\n✅ SUBMISSION FOUND: {sub.get('id', 'N/A')}")
                print(f"   Title: {sub.get('title', 'N/A')[:60]}")
                print(f"   Status: {sub.get('status', 'N/A')}")
                print(f"   Created: {sub.get('createdAt', 'N/A')}")

                # Check if uploaded to YouTube
                if sub.get('youtubeVideoId'):
                    youtube_url = f"https://youtube.com/watch?v={sub['youtubeVideoId']}"
                    print(f"\n🎉 VIDEO UPLOADED TO YOUTUBE!")
                    print(f"   URL: {youtube_url}")
                    client.close()
                    return youtube_url, sub
                elif sub.get('status') == 'FAILED':
                    print(f"\n❌ PRODUCTION FAILED")
                    if sub.get('error'):
                        print(f"   Error: {sub.get('error')}")
                    client.close()
                    return None, sub
                else:
                    print(f"   Status: {sub.get('status')} (waiting for upload...)")

        # Check video tasks
        new_tasks = await tasks_coll.find(
            {
                'clientId': 'chanakya-sutra',
                'createdAt': {'$gte': cutoff_time}
            }
        ).sort([('createdAt', -1)]).to_list(10)

        if new_tasks and i % 4 == 0:  # Print every minute
            print(f"\n   Video tasks: {len(new_tasks)}")
            for task in new_tasks[:3]:
                print(f"     - {task.get('provider', 'N/A')}: {task.get('status', 'N/A')}")

        elapsed = (datetime.now(timezone.utc) - start_time).seconds // 60
        if i % 4 == 0:  # Print every minute
            print(f"\n⏱️  Elapsed: {elapsed} min / {timeout_minutes} min timeout")

        await asyncio.sleep(15)

    print(f"\n⏱️  Timeout reached ({timeout_minutes} minutes)")
    client.close()
    return None, None


async def trigger_and_monitor():
    """
    Trigger production and monitor until completion
    """
    print("=" * 60)
    print("CHANAKYA LIVE END-TO-END PRODUCTION TEST")
    print("=" * 60)
    print(f"Start time: {datetime.now(timezone.utc).isoformat()}")
    print()

    # Import after path is set
    try:
        from services.publishing_scheduler import _chanakya_generate_short

        day = datetime.now(timezone.utc).strftime("%A")

        print("📋 TEST CONFIGURATION:")
        print(f"   Day: {day}")
        print(f"   Format: SHORT (50-60 seconds)")
        print(f"   Expected cost: ~$3.54")
        print(f"   Expected duration: 10-15 minutes")
        print()

        print("🚀 TRIGGERING PRODUCTION...")
        print("=" * 60)

        # Trigger production (this runs async in background on Railway)
        task = asyncio.create_task(_chanakya_generate_short(day))

        # Give it a moment to start
        await asyncio.sleep(5)

        # Monitor the production
        youtube_url, submission = await monitor_production(timeout_minutes=30)

        if youtube_url:
            print("\n" + "=" * 60)
            print("✅ SUCCESS - PRODUCTION COMPLETE!")
            print("=" * 60)
            print(f"YouTube URL: {youtube_url}")
            print(f"Title: {submission.get('title', 'N/A')}")
            print(f"Status: {submission.get('status', 'N/A')}")
            print()
            print("You can now post this video!")
            return True
        else:
            print("\n" + "=" * 60)
            print("⚠️ PRODUCTION DID NOT COMPLETE")
            print("=" * 60)
            if submission:
                print(f"Last known status: {submission.get('status', 'N/A')}")
            print()
            print("Check Railway logs for details:")
            print("  railway logs --tail")
            return False

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print()
        print("This may be expected if running locally without API keys.")
        print("Check Railway deployment for actual production status.")
        return False


if __name__ == "__main__":
    result = asyncio.run(trigger_and_monitor())
    sys.exit(0 if result else 1)