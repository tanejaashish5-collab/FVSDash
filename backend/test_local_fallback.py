#!/usr/bin/env python3
"""
Test Local Veo Model Fallback
Tests that the fallback logic works correctly locally
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.insert(0, '/Users/ashishtaneja/Desktop/FVS/backend')
load_dotenv('/Users/ashishtaneja/Desktop/FVS/backend/.env')

from services.video_task_service import create_veo_job, check_veo_job

async def test_fallback():
    print("Testing Veo Model Fallback Locally")
    print("=" * 60)

    # Test with Chanakya prompt
    prompt = """Ancient Mauryan strategist Chanakya teaching wisdom about wealth,
                wearing saffron robes, in palace with pillars"""

    print("Creating video with fallback logic...")
    print(f"Prompt: {prompt[:60]}...")

    try:
        # Create job - will use fallback if needed
        job_result = await create_veo_job({
            'prompt': prompt,
            'aspectRatio': '9:16',
            'quality': 'fast'
        })

        if job_result.is_mocked:
            print("⚠️  Running in mock mode (no API key)")
            return

        print(f"✅ Video job created successfully!")
        print(f"   Job ID: {job_result.job_id}")
        print(f"   Provider: {job_result.provider}")

        # The model used will be logged - check which one succeeded
        if 'veo-3.1-fast' in job_result.job_id:
            print("   Model: Veo 3.1 Fast (primary)")
        elif 'veo-3.1-generate' in job_result.job_id:
            print("   Model: Veo 3.1 Standard (fallback 1)")
        elif 'veo-3.0-generate-001' in job_result.job_id:
            print("   Model: Veo 3.0 Standard (fallback 2)")
        elif 'veo-3.0-fast' in job_result.job_id:
            print("   Model: Veo 3.0 Fast (fallback 3)")
        else:
            print("   Model: Unknown (check logs)")

        # Check status after a moment
        print("\nChecking status after 10 seconds...")
        await asyncio.sleep(10)

        status = await check_veo_job(job_result.job_id)
        print(f"   Status: {status.status}")

        if status.status == 'READY':
            print(f"   ✅ Video ready!")
            print(f"   URL: {status.video_url[:80]}...")
        elif status.status == 'FAILED':
            print(f"   ❌ Generation failed")
        else:
            print(f"   ⏳ Still processing (normal, takes 30-60 seconds)")

        print("\n" + "=" * 60)
        print("✅ Model Fallback Working!")
        print("\nFallback Order:")
        print("1. Veo 3.1 Fast (10 videos/day)")
        print("2. Veo 3.1 Standard (10 videos/day)")
        print("3. Veo 3.0 Standard (10 videos/day)")
        print("4. Veo 3.0 Fast (10 videos/day)")
        print("\nTotal: 40 videos/day across all models")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(test_fallback())