#!/usr/bin/env python3
"""
Setup Chanakya Sutra Channel Profile
Configures brand identity for all AI-generated content.
"""
import os
import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

async def setup_chanakya_profile():
    """Configure Chanakya Sutra channel profile."""
    from dotenv import load_dotenv
    load_dotenv()

    from services.channel_profile_service import update_channel_profile, get_channel_profile

    print("=" * 70)
    print("🎯 CHANAKYA SUTRA CHANNEL PROFILE SETUP")
    print("=" * 70)
    print()

    CLIENT_ID = "chanakya-sutra"

    # Profile configuration
    profile_data = {
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
        "thumbnailsPerShort": 1,  # Generate 1 thumbnail per video
        "voiceId": ""  # Use default ElevenLabs voice (can customize later)
    }

    print("Configuring channel profile...")
    print()
    print("Language Style: Hinglish")
    print("  → Scripts in Hindi (Roman script) with performance cues")
    print("  → Example: 'Dekho bhai [short pause] ye bahut important hai'")
    print()
    print("Thumbnail Style: Black Minimal")
    print("  → Pure black background, bold white text, gold accents")
    print("  → Premium Chanakya aesthetic")
    print()
    print("Brand Voice: Authoritative storyteller, dramatic, wise")
    print()
    print("Content Pillars:")
    for pillar in profile_data["contentPillars"]:
        print(f"  • {pillar}")
    print()

    try:
        updated_profile = await update_channel_profile(CLIENT_ID, profile_data)

        print("✅ Channel profile configured successfully!")
        print()
        print("=" * 70)
        print("VERIFICATION")
        print("=" * 70)
        print()

        # Verify by fetching the profile
        profile = await get_channel_profile(CLIENT_ID)

        print(f"Profile ID: {profile['id']}")
        print(f"Language: {profile['languageStyle']}")
        print(f"Thumbnail Style: {profile['thumbnailStyle']}")
        print(f"Tone: {profile['tone']}")
        print(f"Content Pillars: {len(profile['contentPillars'])} themes configured")
        print()

        # Show how it affects script generation
        from services.channel_profile_service import get_script_instructions
        instructions = get_script_instructions(profile)

        print("=" * 70)
        print("HOW THIS AFFECTS AI GENERATION")
        print("=" * 70)
        print()
        print("Script instructions that will be sent to Gemini:")
        print()
        print(instructions[:500] + "...")
        print()

        print("✅ Setup complete! All future content will use this archetype.")
        print()

        return True

    except Exception as e:
        print(f"❌ ERROR: Failed to set up profile: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(setup_chanakya_profile())
    sys.exit(0 if success else 1)
