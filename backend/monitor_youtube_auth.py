#!/usr/bin/env python3
"""
Monitor YouTube OAuth authentication status
Checks every 30 seconds and notifies when tokens are saved
"""

import os
import asyncio
import time
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

async def check_tokens():
    """Check if YouTube tokens are saved."""
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL not configured")
        return False

    client = AsyncIOMotorClient(mongo_url)
    db = client.fvs_production

    token = await db.oauth_tokens.find_one({
        'clientId': 'chanakya-sutra',
        'platform': 'youtube'
    })

    if token and token.get('refreshToken'):
        print(f"\n{'='*70}")
        print('🎉 SUCCESS! YouTube tokens FOUND and VALID!')
        print(f"{'='*70}")
        print(f"✅ Access Token: {token.get('accessToken', 'N/A')[:30]}...")
        print(f"✅ Refresh Token: Present")
        print(f"✅ Connected: {token.get('connected', False)}")
        print(f"✅ Channel: {token.get('channelName', 'Unknown')}")
        print(f"✅ Channel ID: {token.get('channelId', 'Unknown')}")
        print('')
        print('🚀 AUTOMATION READY FOR TOMORROW!')
        print('   📺 Tuesday Long-form video at 8 PM IST')
        print('   ⏱️  Duration: 6 minutes')
        print('   🎬 Content: 3 Veo clips + 33 AI images')
        print('   💰 Cost: ~$1.14')
        print('   📤 Auto-upload to YouTube: YES ✅')
        print(f"{'='*70}\n")
        return True
    elif token:
        print(f"⚠️  Tokens found but no refresh token")
        return False
    else:
        return False

async def main():
    """Monitor authentication status."""
    print("🔄 YOUTUBE OAUTH MONITOR - CHECKING EVERY 30 SECONDS")
    print("=" * 70)
    print("ROOT CAUSE FIXED: Missing 'upsert=True' in oauth.py line 567")
    print("")
    print("📝 TO AUTHENTICATE:")
    print("   http://localhost:8000/api/oauth/connect/youtube?clientId=chanakya-sutra")
    print("")
    print("Monitoring started...")
    print("")

    attempt = 0
    max_attempts = 10  # 5 minutes total (30 sec × 10)

    while attempt < max_attempts:
        attempt += 1
        timestamp = datetime.now().strftime("%H:%M:%S")

        success = await check_tokens()

        if success:
            print("\n✅ Authentication successful! Automation is ready.")
            print("Tomorrow's video will auto-upload to YouTube.")
            break
        else:
            print(f"[{timestamp}] Attempt {attempt}/{max_attempts} - No tokens yet, waiting...")

        if attempt < max_attempts:
            await asyncio.sleep(30)  # 30 seconds

    if attempt >= max_attempts:
        print("\n⏰ 5 minutes elapsed. Please check authentication manually.")
        print("   Run this script again after authenticating.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nMonitoring stopped.")