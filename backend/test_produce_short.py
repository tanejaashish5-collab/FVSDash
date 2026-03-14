#!/usr/bin/env python3
"""
Test Real Video Production Pipeline with Kling
Verifies that FAL_KEY is working and produce_short() generates real videos.
"""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

async def test_produce_short():
    """Test the complete video production pipeline with Kling."""

    print("=" * 60)
    print("🧪 Testing Real Video Production Pipeline with Kling")
    print("=" * 60)
    print()

    # Check FAL_KEY
    fal_key = os.getenv("FAL_KEY")
    if not fal_key:
        print("❌ ERROR: FAL_KEY not found in .env")
        print("   Add: FAL_KEY=your-key-here to backend/.env")
        return False

    print(f"✅ FAL_KEY found: {fal_key[:20]}...{fal_key[-10:]}")
    print()

    # Test import
    try:
        from services.video_production_service import produce_short
        print("✅ video_production_service imported successfully")
    except ImportError as e:
        print(f"❌ ERROR: Could not import video_production_service: {e}")
        return False

    print()
    print("📹 Generating test Short (50-60 seconds)")
    print("   Script: Chanakya wisdom about identifying enemies")
    print("   Expected: 5 scenes × 10 sec × $0.70 = $3.50 cost")
    print("   Time: ~3-5 minutes")
    print()

    # Test script (short Chanakya content)
    test_script = """
    Chanakya kehte hain - dushman ko kaise pehchane?
    Teen signals hain jo kabhi galat nahi hote.

    Pehla signal - wo tumhari success se jalta hai.
    Tumhare aage badhne par uska chehra dikhaata hai jealousy.

    Dusra signal - wo tumhare peeche badnaam karta hai.
    Samne praise kare, par peeche criticism faila de.

    Teesra signal - wo tumhe smile karke backstab karta hai.
    Dosti ka dhong kare, par mauke pe dhoka de.

    In teeno signals ko pehchano aur aise logon se door raho.
    Chanakya ka yeh sutra zindagi mein bohot kaam aayega.
    """

    try:
        print("⏳ Starting video generation...")
        print("   (This will take 3-5 minutes - Kling is processing)")
        print()

        result = await produce_short(
            script=test_script,
            title="Chanakya Test - Enemy Detection Signals"
        )

        print()
        print("=" * 60)
        print("✅ SUCCESS! Real Video Generated with Kling!")
        print("=" * 60)
        print()
        print(f"📹 Video URL: {result['url']}")
        print(f"⏱️  Duration: {result.get('duration', 0):.1f} seconds")
        print(f"🎬 Scenes: {result.get('scene_count', '?')} clips")
        print(f"📐 Format: {result.get('format', 'short')} ({result.get('aspect_ratio', '9:16')})")
        print(f"💰 Estimated cost: ~${result.get('scene_count', 5) * 0.70:.2f}")
        print()
        print("🎉 Your Kling integration is working!")
        print("   You can now wire this to FVS automation.")
        print()

        return True

    except Exception as e:
        print()
        print("=" * 60)
        print("❌ ERROR: Video generation failed")
        print("=" * 60)
        print(f"   Error: {e}")
        print()
        print("🔍 Possible causes:")
        print("   1. FAL_KEY invalid (check fal.ai dashboard)")
        print("   2. fal-client not installed (pip install fal-client)")
        print("   3. No credits on fal.ai account")
        print("   4. Network timeout")
        print()

        # Print full traceback for debugging
        import traceback
        print("Full traceback:")
        print(traceback.format_exc())

        return False


if __name__ == "__main__":
    success = asyncio.run(test_produce_short())
    sys.exit(0 if success else 1)
