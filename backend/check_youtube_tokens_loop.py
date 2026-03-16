#!/usr/bin/env python3
"""
Check YouTube tokens every 5 minutes until they're saved
"""

import os
import asyncio
import time
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime

# Load environment
load_dotenv()

async def check_tokens():
    """Check if YouTube tokens are saved."""
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL not configured")
        return False

    client = AsyncIOMotorClient(mongo_url)
    db = client.fvs_production

    # Check for Chanakya Sutra tokens
    token = await db.oauth_tokens.find_one({
        'clientId': 'chanakya-sutra',
        'platform': 'youtube'
    })

    if token and token.get('refreshToken'):
        print(f"\n{'='*60}")
        print('🎉 SUCCESS! YouTube tokens FOUND and VALID!')
        print(f"   Access Token: {token.get('accessToken', 'N/A')[:30]}...")
        print(f"   Refresh Token: ✅ Present")
        print(f"   Connected: {token.get('connected', False)}")
        print(f"   Channel: {token.get('channelName', 'Unknown')}")
        print(f"   Channel ID: {token.get('channelId', 'Unknown')}")
        print('')
        print('✅ AUTOMATION READY FOR TOMORROW!')
        print('   Tuesday 8 PM IST - Long-form video will auto-upload')
        print(f"{'='*60}\n")
        return True
    elif token:
        print(f"⚠️  Tokens found but no refresh token - need to re-auth")
        return False
    else:
        print(f"❌ No tokens found - waiting...")
        return False

async def main():
    """Check every 5 minutes until tokens are saved."""
    attempt = 0
    print("🔄 Checking for YouTube tokens every 5 minutes...")
    print("   Please authenticate at: http://localhost:8000/api/oauth/connect/youtube?clientId=chanakya-sutra")
    print("")

    while True:
        attempt += 1
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] Attempt #{attempt} - Checking...")

        success = await check_tokens()

        if success:
            print("\n✅ Tokens successfully saved! Automation is ready.")
            break

        print(f"   Waiting 5 minutes before next check...\n")
        await asyncio.sleep(300)  # 5 minutes

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nStopped checking.")