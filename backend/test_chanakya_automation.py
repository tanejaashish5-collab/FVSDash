#!/usr/bin/env python3
"""
Test Chanakya Sutra 3x/Week Automation Manually
Triggers Tuesday/Thursday/Sunday content generation without waiting for cron.
Choose to test Short OR Long-form production.
"""
import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent))

async def test_automation():
    """Run Chanakya 3x/week content generation manually."""

    print("=" * 70)
    print("🎬 CHANAKYA SUTRA 3X/WEEK AUTOMATION - MANUAL TEST")
    print("=" * 70)
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}")
    print()
    print("Choose what to test:")
    print("  1 → Test Short production (50 sec, 5 clips)")
    print("  2 → Test Long-form production (6 min, 3 clips + 33 images)")
    print()

    # Check if choice provided via command-line argument
    if len(sys.argv) > 1 and sys.argv[1] in ['1', '2']:
        choice = sys.argv[1]
        print(f"Enter 1 or 2: {choice} (from command-line)")
    else:
        choice = input("Enter 1 or 2: ").strip()

    if choice == "1":
        test_type = "short"
        print()
        print("Testing SHORT production:")
        print("  • Generate 1 Short idea (Chanakya wisdom, Hinglish)")
        print("  • Produce: Script → Voice → 5 Kling clips (10 sec each) → Captions")
        print("  • ⏱️  Expected time: ~15 minutes")
        print("  • 💰 Expected cost: ~$3.50 (5 clips × $0.70)")
    elif choice == "2":
        test_type = "longform"
        print()
        print("Testing LONG-FORM production:")
        print("  • Generate 1 Long-form idea (Chanakya wisdom, Hinglish)")
        print("  • Produce: Script → Voice → 3 Kling hero clips + 33 AI images → Captions")
        print("  • ⏱️  Expected time: ~25 minutes")
        print("  • 💰 Expected cost: ~$2.25 (3 clips × $0.70 + images)")
    else:
        print("❌ Invalid choice. Exiting.")
        return False

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
        # Import the automation functions
        from services.publishing_scheduler import _chanakya_generate_short, _chanakya_generate_longform

        # Run the selected test
        if test_type == "short":
            await _chanakya_generate_short("Manual Test")
            video_count = "1 Short"
        else:
            await _chanakya_generate_longform("Manual Test")
            video_count = "1 Long-form"

        print()
        print("=" * 70)
        print("✅ AUTOMATION TEST COMPLETE!")
        print("=" * 70)
        print()
        print("📊 What to check:")
        print(f"  1. MongoDB submissions_collection → {video_count} video")
        print("  2. Backend logs → Look for '[Chanakya Manual Test] ✅' messages")
        print("  3. fal.ai dashboard → Check usage/billing for API calls")
        print()
        print("🎥 Video saved to MongoDB with status='SCHEDULED'")
        print("   (Auto-posting to YouTube/TikTok/IG requires OAuth setup)")
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

    # Check if running non-interactively (for automated testing)
    import sys
    if len(sys.argv) > 1 and sys.argv[1] in ['1', '2']:
        # Skip user prompts if argument provided
        pass
    else:
        input("⚠️  Press ENTER to start (or Ctrl+C to cancel)... ")

    print()

    success = asyncio.run(test_automation())
    sys.exit(0 if success else 1)
