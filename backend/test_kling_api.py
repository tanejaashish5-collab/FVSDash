#!/usr/bin/env python3
"""
Test Kling API Connection via fal.ai
Quick script to verify FAL_KEY is working before full automation runs.
"""
import os
import sys
import asyncio
from pathlib import Path

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).parent))

async def test_kling_api():
    """Test Kling API connection with a simple video generation request."""

    print("🧪 Testing Kling API Connection...")
    print("=" * 60)

    # Check FAL_KEY exists
    from dotenv import load_dotenv
    load_dotenv()

    fal_key = os.getenv("FAL_KEY")
    if not fal_key:
        print("❌ ERROR: FAL_KEY not found in .env")
        print("   Add: FAL_KEY=your-key-here to backend/.env")
        return False

    print(f"✅ FAL_KEY found: {fal_key[:20]}...{fal_key[-10:]}")
    print()

    # Test import fal_client
    try:
        import fal_client
        print("✅ fal-client package imported successfully")
    except ImportError as e:
        print(f"❌ ERROR: fal-client not installed: {e}")
        print("   Run: pip install fal-client>=0.5.0")
        return False

    print()
    print("🎬 Testing Kling video generation (5-second test clip)...")
    print("   This will use ~$0.35 of fal.ai credits")
    print("   Prompt: 'Ancient Indian sage with white beard, cinematic lighting'")
    print()

    try:
        # Set API key
        fal_client.api_key = fal_key

        # Generate a very short test video (5 seconds, cheapest)
        print("⏳ Generating video (this may take 60-120 seconds)...")

        result = await fal_client.run_async(
            "fal-ai/kling-video/v2.6/pro/text-to-video",
            arguments={
                "prompt": "Ancient Indian sage with white beard, golden hour lighting, cinematic 4K",
                "duration": "5",
                "aspect_ratio": "9:16",
                "negative_prompt": "blurry, low quality, distorted"
            }
        )

        # Check result
        video_url = result.get("video", {}).get("url")

        if video_url:
            print()
            print("=" * 60)
            print("✅ SUCCESS! Kling API is working!")
            print("=" * 60)
            print(f"📹 Video URL: {video_url}")
            print(f"💰 Cost: ~$0.35 (5 seconds @ $0.07/sec)")
            print()
            print("🎉 Your setup is ready for automation!")
            print()
            return True
        else:
            print(f"❌ ERROR: No video URL in response")
            print(f"   Response: {result}")
            return False

    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ ERROR: Kling API test failed")
        print("=" * 60)
        print(f"   Error: {e}")
        print()
        print("🔍 Possible causes:")
        print("   1. Invalid FAL_KEY (check fal.ai dashboard)")
        print("   2. No credits/payment method (add on fal.ai)")
        print("   3. Network timeout (check internet)")
        print()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_kling_api())
    sys.exit(0 if success else 1)
