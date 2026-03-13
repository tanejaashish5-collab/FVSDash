#!/usr/bin/env python3
"""Direct MongoDB setup for Chanakya profile - no FastAPI dependencies"""
import asyncio
import os
from datetime import datetime
from pymongo import MongoClient

async def setup_profile():
    """Set up Chanakya channel profile directly in MongoDB."""

    print("=" * 70)
    print("🎯 CHANAKYA SUTRA CHANNEL PROFILE SETUP")
    print("=" * 70)
    print()

    # Get MongoDB URL from environment
    mongo_url = "mongodb+srv://tanejaashish5_db_user:Atlas007@forgevoice.x0ngmvf.mongodb.net/forgevoice_prod?retryWrites=true&w=majority&appName=ForgeVoice"

    print("Connecting to MongoDB...")

    try:
        # Connect to MongoDB
        client = MongoClient(mongo_url)
        db = client['forgevoice_prod']
        collection = db['channel_profiles_collection']

        print("✅ Connected to MongoDB")
        print()

        # Chanakya profile data
        profile = {
            "id": "chanakya-profile-001",
            "clientId": "chanakya-sutra",
            "languageStyle": "hinglish",
            "thumbnailStyle": "black_minimal",
            "brandDescription": "Channel delivering ancient Chanakya Niti wisdom for modern business leaders, entrepreneurs, and strategists. Content blends Indian philosophy with practical business strategy, told through cinematic storytelling in Hinglish.",
            "tone": "Authoritative storyteller, dramatic and wise, strategic thinker, speaks with gravitas and conviction",
            "contentPillars": [
                "Chanakya Niti Principles",
                "Leadership & Strategy",
                "Business Warfare Tactics",
                "Ancient Indian Philosophy",
                "Entrepreneurship Wisdom",
                "Power Dynamics",
                "Negotiation Mastery",
                "Decision-Making Frameworks"
            ],
            "thumbnailPromptTemplate": "Pure black background, bold white text, single gold accent line, no faces, extremely high contrast, dramatic lighting",
            "visualPromptTemplate": "Chanakya — bald head, sharp defined jawline, long white beard, saffron-orange robe, intense piercing eyes, calm but commanding expression, ancient Indian strategist aesthetic, age ~55, lean build, photorealistic, cinematic lighting, golden hour",
            "scriptsPerIdea": 1,
            "thumbnailsPerShort": 1,
            "voiceId": "",
            "createdAt": datetime.utcnow().isoformat(),
            "updatedAt": datetime.utcnow().isoformat()
        }

        # Check if profile already exists
        existing = collection.find_one({"clientId": "chanakya-sutra"})

        if existing:
            print("⚠️  Profile already exists. Updating...")
            collection.update_one(
                {"clientId": "chanakya-sutra"},
                {"$set": profile}
            )
            print("✅ Profile updated!")
        else:
            print("Creating new profile...")
            collection.insert_one(profile)
            print("✅ Profile created!")

        print()
        print("=" * 70)
        print("PROFILE CONFIGURED")
        print("=" * 70)
        print()
        print(f"Client ID: {profile['clientId']}")
        print(f"Language: {profile['languageStyle']} (Hinglish)")
        print(f"Thumbnail Style: {profile['thumbnailStyle']} (Black Minimal)")
        print(f"Brand Voice: {profile['tone']}")
        print(f"Content Pillars: {len(profile['contentPillars'])} themes")
        print()
        print("Visual Archetype:")
        print(f"  {profile['visualPromptTemplate'][:80]}...")
        print()
        print("=" * 70)
        print("✅ SETUP COMPLETE!")
        print("=" * 70)
        print()
        print("All future AI-generated content will use the Chanakya archetype:")
        print("  • Scripts in Hinglish with performance cues")
        print("  • Black minimal thumbnails with gold accents")
        print("  • Chanakya visual prompts for video clips")
        print("  • Authoritative storyteller tone")
        print()
        print("Next steps:")
        print("  1. Set up YouTube OAuth for auto-posting")
        print("  2. Run: python3 test_chanakya_automation.py")
        print()

        client.close()
        return True

    except Exception as e:
        print()
        print("=" * 70)
        print("❌ ERROR")
        print("=" * 70)
        print(f"Failed to set up profile: {e}")
        print()
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(setup_profile())
    exit(0 if success else 1)
