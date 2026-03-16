#!/usr/bin/env python3
"""Test Chanakya writing prompt with Veo 3.1 Fast."""

import asyncio
import os
import sys
sys.path.insert(0, '/Users/ashishtaneja/Desktop/FVS/backend')

# Set up environment
from dotenv import load_dotenv
load_dotenv('/Users/ashishtaneja/Desktop/FVS/backend/.env')

async def test_chanakya_prompt():
    """Test the specific Chanakya writing prompt."""

    from services.video_task_service import create_veo_job, check_veo_job
    import time

    # The exact prompt from user
    prompt = """Ancient Mauryan strategist Chanakya writing on a palm-leaf scroll inside a candlelit Takshashila chamber, stone walls, drifting smoke, cinematic lighting, slow push-in, 4K, photorealistic. Chanakya — bald head, sharp defined jawline, long white beard, saffron-orange robe, intense piercing eyes, calm but commanding expression, ancient Indian strategist aesthetic, age ~55, lean build, photorealistic."""

    print("=" * 60)
    print("TESTING CHANAKYA WRITING PROMPT")
    print("=" * 60)
    print(f"\nPrompt: {prompt[:100]}...")
    print("\n1. Creating Veo 3.1 Fast video job...")

    try:
        # Create video job
        job_result = await create_veo_job({
            "prompt": prompt,
            "aspectRatio": "9:16",
            "quality": "fast"  # Will be forced to fast anyway
        })

        if job_result.is_mocked:
            print("   ⚠️  MOCKED: API key not configured")
            print("   Add GEMINI_API_KEY to Railway variables")
            return

        print(f"   ✅ Job created: {job_result.job_id}")
        print("   Provider: Veo 3.1 Fast")
        print("   Duration: 8 seconds")
        print("   Aspect: 9:16 (vertical)")

        # Poll for completion
        print("\n2. Waiting for video generation...")
        start_time = time.time()
        max_wait = 180  # 3 minutes

        while time.time() - start_time < max_wait:
            status = await check_veo_job(job_result.job_id)

            if status.status == "READY":
                print(f"\n   ✅ VIDEO READY!")
                print(f"   Time: {int(time.time() - start_time)} seconds")
                print(f"   URL: {status.video_url[:100]}...")
                return status.video_url

            elif status.status == "FAILED":
                print(f"\n   ❌ Generation failed")
                return None

            # Still processing
            elapsed = int(time.time() - start_time)
            print(f"   ... {elapsed}s - {status.status}", end="\r")
            await asyncio.sleep(5)

        print("\n   ⏱️  Timeout - video still processing")

    except Exception as e:
        print(f"\n   ❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Testing Chanakya prompt with Veo 3.1 Fast...")
    print("Note: Railway deployment needs 1-2 min to update")
    print("-" * 60)

    video_url = asyncio.run(test_chanakya_prompt())

    if video_url:
        print("\n" + "=" * 60)
        print("SUCCESS! Video generated with Chanakya prompt")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("Test failed - check Railway logs for details")
        print("=" * 60)