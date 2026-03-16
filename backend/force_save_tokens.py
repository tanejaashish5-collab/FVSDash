#!/usr/bin/env python3
"""
Force save YouTube tokens to database for Chanakya Sutra
"""

import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

load_dotenv()

async def save_tokens():
    mongo_url = os.environ.get('MONGO_URL')
    if not mongo_url:
        print("❌ MONGO_URL not configured")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client.fvs_production

    # This is a placeholder - we need real tokens from OAuth
    # But this will test if database writes are working

    print("🔧 Testing database write for YouTube tokens...")

    # Create test record
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(seconds=3600)).isoformat()

    result = await db.oauth_tokens.update_one(
        {"clientId": "chanakya-sutra", "platform": "youtube"},
        {"$set": {
            "connected": False,  # Set to false for testing
            "accessToken": "test_access_token_placeholder",
            "refreshToken": None,  # No refresh token yet
            "expiresAt": expires_at,
            "accountName": "YouTube Channel",
            "accountHandle": "@channel",
            "accountMeta": {
                "subscriberCount": "0",
                "channelId": None,
                "uploadsPlaylistId": None
            },
            "channelId": None,
            "channelName": "YouTube Channel",
            "connectedAt": now.isoformat(),
            "updatedAt": now.isoformat(),
            "oauthState": None,
            "codeVerifier": None
        }},
        upsert=True
    )

    print(f"✅ Database write test result:")
    print(f"   Matched: {result.matched_count}")
    print(f"   Modified: {result.modified_count}")
    print(f"   Upserted: {result.upserted_id}")

    # Check if it was saved
    token = await db.oauth_tokens.find_one({
        'clientId': 'chanakya-sutra',
        'platform': 'youtube'
    })

    if token:
        print("✅ Token record created successfully!")
        print(f"   ID: {token.get('_id')}")
        print("")
        print("⚠️  This is a test record - you still need to authenticate:")
        print("   http://localhost:8000/api/oauth/connect/youtube?clientId=chanakya-sutra")
    else:
        print("❌ Failed to create token record")

asyncio.run(save_tokens())
