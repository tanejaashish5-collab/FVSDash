#!/usr/bin/env python3
"""
Test Chanakya Sutra Automation Manually
Triggers the daily content generation without waiting for cron.
"""
import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent))

async def test_automation():
    """Run Chanakya daily content generation manually."""

    print("=" * 70)
    print("🎬 CHANAKYA SUTRA AUTOMATION - MANUAL TEST")
    print("=" * 70)
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}")
    print()
    print("This will:")
    print("  1. Generate 1 Short idea (Chanakya Niti, Hinglish)")
    print("  2. Produce Short: Script → Voice → 8 Kling clips → Captions")
    print("  3. Generate 1 Long-form idea (Chanakya Niti, Hinglish)")
    print("  4. Produce Long: Script → Voice → 6 Pro + 24 Std clips + images")
    print()
    print("⏱️  Expected time: ~45 minutes")
    print("💰 Expected cost: ~$11.21 ($4.58 short + $6.63 long)")
    print()
    print("=" * 70)
    print()

    # Load environment
    from dotenv import load_dotenv
    load_dotenv()

    # Verify critical keys
    required_keys = ["FAL_KEY", "GEMINI_API_KEY", "ELEVENLABS_API_KEY", "MONGO_URL"]
    missing = []

    for key in required_keys:
        if not os.getenv(key):
            missing.append(key)
        else:
            print(f"✅ {key}: Set")

    if missing:
        print()
        print(f"❌ ERROR: Missing environment variables: {', '.join(missing)}")
        print("   Check your .env file and add the missing keys")
        return False

    print()
    print("🚀 Starting automation test...")
    print("-" * 70)
    print()

    try:
        # Import the automation function
        from services.publishing_scheduler import chanakya_daily_content

        # Run it
        await chanakya_daily_content()

        print()
        print("=" * 70)
        print("✅ AUTOMATION TEST COMPLETE!")
        print("=" * 70)
        print()
        print("📊 What to check:")
        print("  1. MongoDB submissions_collection → 2 new entries (1 short + 1 long)")
        print("  2. Backend logs → Look for '[Chanakya Daily] ✅' messages")
        print("  3. fal.ai dashboard → Check usage/billing for API calls")
        print()
        print("🎥 Videos are saved to MongoDB with status='SCHEDULED'")
        print("   (Auto-posting to YouTube is Week 3 work, not yet implemented)")
        print()
        return True

    except Exception as e:
        print()
        print("=" * 70)
        print("❌ AUTOMATION TEST FAILED")
        print("=" * 70)
        print(f"Error: {e}")
        print()
        import traceback
        traceback.print_exc()
        print()
        print("🔍 Troubleshooting:")
        print("  1. Check backend logs for detailed error messages")
        print("  2. Verify MongoDB is running and accessible")
        print("  3. Check fal.ai credits haven't run out")
        print("  4. Ensure all API keys are valid")
        print()
        return False


if __name__ == "__main__":
    print()
    input("⚠️  Press ENTER to start (or Ctrl+C to cancel)... ")
    print()

    success = asyncio.run(test_automation())
    sys.exit(0 if success else 1)
