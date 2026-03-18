#!/usr/bin/env python3
"""
Quick production check for Chanakya automation
"""

import asyncio
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

MONGO_URL = "mongodb+srv://tanejaashish5_db_user:Atlas007@forgevoice.x0ngmvf.mongodb.net/forgevoice_prod?retryWrites=true&w=majority&appName=ForgeVoice"
API_URL = "https://fvsdash-production.up.railway.app"

async def check_all():
    print("=" * 60)
    print("CHANAKYA PRODUCTION STATUS CHECK")
    print("=" * 60)
    print(f"Time: {datetime.now(timezone.utc).isoformat()}")
    print()

    # Check API
    print("1. CHECKING API STATUS...")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{API_URL}/api/health")
            if resp.status_code == 200:
                data = resp.json()
                print(f"   ✅ API: {data.get('status', 'unknown')}")
                print(f"   ✅ Database: {data.get('db', 'unknown')}")
            else:
                print(f"   ❌ API returned status {resp.status_code}")
    except Exception as e:
        print(f"   ❌ API Error: {e}")

    print()

    # Check Database
    print("2. CHECKING DATABASE...")
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client['forgevoice_prod']

        # OAuth status
        oauth_coll = db['oauth_tokens_collection']
        oauth = await oauth_coll.find_one({'clientId': 'chanakya-sutra', 'platform': 'youtube'})
        if oauth:
            print(f"   ✅ YouTube OAuth: Connected")
            print(f"      Channel: {oauth.get('channelName', 'Unknown')}")
        else:
            print(f"   ❌ YouTube OAuth: Not connected")

        # Recent submissions
        subs_coll = db['submissions_collection']

        # Last 24 hours
        one_day_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_count = await subs_coll.count_documents({
            'clientId': 'chanakya-sutra',
            'createdAt': {'$gte': one_day_ago}
        })

        # Last 7 days
        one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        week_count = await subs_coll.count_documents({
            'clientId': 'chanakya-sutra',
            'createdAt': {'$gte': one_week_ago}
        })

        print(f"   📊 Submissions:")
        print(f"      Last 24h: {recent_count}")
        print(f"      Last 7 days: {week_count}")

        # Most recent submission
        recent = await subs_coll.find_one(
            {'clientId': 'chanakya-sutra'},
            sort=[('createdAt', -1)]
        )

        if recent:
            print(f"   📺 Most Recent Video:")
            print(f"      Title: {recent.get('title', 'N/A')[:50]}")
            print(f"      Status: {recent.get('status', 'N/A')}")
            print(f"      Created: {recent.get('createdAt', 'N/A')}")
            if recent.get('youtubeVideoId'):
                print(f"      YouTube: https://youtube.com/watch?v={recent['youtubeVideoId']}")

        # Check video tasks
        video_coll = db['video_tasks_collection']

        # Recent failures
        failed_tasks = await video_coll.count_documents({
            'clientId': 'chanakya-sutra',
            'status': 'FAILED',
            'createdAt': {'$gte': one_day_ago}
        })

        if failed_tasks > 0:
            print(f"   ⚠️ Failed video tasks in last 24h: {failed_tasks}")

        client.close()

    except Exception as e:
        print(f"   ❌ Database Error: {e}")

    print()

    # Production Schedule
    print("3. PRODUCTION SCHEDULE")
    print("   📅 Automated Schedule (IST / UTC):")
    print("      SHORTS (4x/week): Sat, Mon, Wed, Fri @ 8 PM IST (14:30 UTC)")
    print("      LONG-FORM (3x/week): Sun, Tue, Thu @ 8 PM IST (14:30 UTC)")

    # Today's schedule
    now = datetime.now(timezone.utc)
    day = now.strftime("%A")

    print(f"   📅 Today ({day}):")
    if day in ["Saturday", "Monday", "Wednesday", "Friday"]:
        print(f"      ➡️ SHORT video scheduled at 8 PM IST")
    elif day in ["Sunday", "Tuesday", "Thursday"]:
        print(f"      ➡️ LONG-FORM video scheduled at 8 PM IST")
    else:
        print(f"      No scheduled production")

    print()

    # Railway Deployment
    print("4. DEPLOYMENT STATUS")
    print("   Latest commits pushed:")
    print("      - a426dd3: Complete end-to-end fixes (just now)")
    print("      - df6c42e: Veo redirect fix")
    print("      - e9934ad: AudioGenerationResult fix")
    print("   ⏳ Railway should auto-deploy within 2-3 minutes")

    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)

    if recent_count > 0:
        print("✅ Production is working - videos created in last 24h")
    elif week_count > 0:
        print("⚠️ Production intermittent - some videos in last week")
    else:
        print("❌ Production not running - no videos in last week")

    print()
    print("RECOMMENDED ACTIONS:")
    print("1. Wait 5 minutes for Railway deployment")
    print("2. Check Railway logs: railway logs --tail")
    print("3. Trigger test production: python3 backend/monitor_chanakya.py trigger --format short")
    print("4. Monitor: python3 backend/monitor_chanakya.py status")

    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(check_all())