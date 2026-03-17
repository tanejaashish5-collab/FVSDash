#!/usr/bin/env python3
"""
Test script to manually trigger Chanakya video production.
Run this AFTER re-authenticating YouTube OAuth.
"""
import asyncio
import httpx
from datetime import datetime

async def trigger_chanakya():
    """Trigger Chanakya long-form video production."""

    # Railway API endpoint
    base_url = "https://fvsdash.up.railway.app"

    # You need to get your auth token from browser
    # Go to fvsdash.up.railway.app, login, open DevTools > Application > Local Storage
    # Copy the 'token' value

    print("=" * 60)
    print("CHANAKYA VIDEO PRODUCTION TRIGGER")
    print("=" * 60)
    print()

    token = input("Paste your auth token from browser (or press Enter to skip): ").strip()

    if not token:
        print("\n⚠️  No token provided. Here's what you need to do:\n")
        print("1. Go to https://fvsdash.up.railway.app")
        print("2. Log in as admin")
        print("3. Open browser DevTools (F12)")
        print("4. Go to Application > Local Storage > fvsdash.up.railway.app")
        print("5. Copy the 'token' value")
        print("6. Run this script again with the token")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            # Trigger long-form video
            print(f"\n🎬 Triggering long-form video for {datetime.now().strftime('%A')}...")

            response = await client.post(
                f"{base_url}/admin/chanakya/trigger",
                headers=headers,
                params={"format": "longform"}
            )

            if response.status_code == 200:
                data = response.json()
                print(f"✅ SUCCESS: {data.get('message')}")
                print(f"\n📊 Status: {data.get('status')}")
                print(f"📺 Format: {data.get('format')}")
                print("\n🔍 Next steps:")
                print("1. Check Railway logs for progress")
                print("2. Video will take 6-8 minutes to produce")
                print("3. Will auto-upload to YouTube when done")
            else:
                print(f"❌ ERROR: Status {response.status_code}")
                print(f"Response: {response.text}")

                if response.status_code == 401:
                    print("\n⚠️  Token is invalid or expired. Get a fresh token from browser.")
                elif response.status_code == 403:
                    print("\n⚠️  You need admin access to trigger videos.")

        except Exception as e:
            print(f"❌ Failed to trigger: {e}")

if __name__ == "__main__":
    asyncio.run(trigger_chanakya())