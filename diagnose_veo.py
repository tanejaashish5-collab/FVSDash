#!/usr/bin/env python3
"""Diagnose Veo 3.1 API access and configuration."""

import os
import asyncio
from dotenv import load_dotenv

# Load environment
load_dotenv('/Users/ashishtaneja/Desktop/FVS/backend/.env')

async def diagnose_veo():
    """Run comprehensive Veo diagnostics."""

    api_key = os.environ.get('GEMINI_API_KEY')

    print("=" * 60)
    print("VEO 3.1 DIAGNOSTICS")
    print("=" * 60)

    # 1. Check API key
    print("\n1. API Key Check:")
    if not api_key:
        print("   ❌ No GEMINI_API_KEY found in environment")
        return
    print(f"   ✅ Key found: {api_key[:20]}...{api_key[-4:]}")

    # 2. Test API connection
    print("\n2. Testing API Connection:")
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        print("   ✅ Client created successfully")
    except Exception as e:
        print(f"   ❌ Failed to create client: {e}")
        return

    # 3. Check available models
    print("\n3. Checking Available Models:")
    try:
        models_response = client.models.list()
        video_models = []
        for model in models_response:
            if 'veo' in model.name.lower():
                video_models.append(model.name)

        if video_models:
            print(f"   ✅ Veo models available: {len(video_models)}")
            for m in video_models:
                print(f"      - {m}")
        else:
            print("   ❌ No Veo models found")
            print("   → You need a paid Google Gemini API tier")
            print("   → Go to: https://aistudio.google.com/billing")
    except Exception as e:
        print(f"   ❌ Could not list models: {e}")

    # 4. Test Veo 3.1 Fast generation
    print("\n4. Testing Veo 3.1 Fast Generation:")
    try:
        from google.genai import types

        prompt = "Test video: Ancient sage Chanakya, 4K quality"
        print(f"   Prompt: {prompt}")

        # Try to create a video job
        operation = client.models.generate_videos(
            model="veo-3.1-fast-generate-preview",
            prompt=prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="9:16",
                number_of_videos=1,
                duration_seconds=8,
            ),
        )

        print(f"   ✅ Job created: {operation.name}")
        print("   Waiting 10 seconds for initial status...")

        await asyncio.sleep(10)

        # Check status
        status_op = client.operations._get_videos_operation(
            operation_name=operation.name
        )

        print("\n5. Operation Status:")
        print(f"   Raw response type: {type(status_op)}")

        if isinstance(status_op, dict):
            print(f"   Done: {status_op.get('done', False)}")
            print(f"   Keys: {list(status_op.keys())}")

            if status_op.get('response'):
                print(f"   Response keys: {list(status_op['response'].keys())}")

                videos = status_op.get('response', {}).get('generatedVideos', [])
                if videos:
                    print(f"   ✅ Videos found: {len(videos)}")
                    video = videos[0]
                    video_data = video.get('video', {})
                    url = video_data.get('uri') or video_data.get('url')
                    if url:
                        print(f"   ✅ Video URL: {url[:50]}...")
                else:
                    print("   ⚠️ No videos in response yet (still processing)")

            if status_op.get('error'):
                error = status_op['error']
                print(f"   ❌ Error: {error}")

        print("\n" + "=" * 60)
        print("DIAGNOSIS COMPLETE")
        print("=" * 60)

        if video_models and not status_op.get('error'):
            print("\n✅ Veo 3.1 is working!")
            print("The issue might be timing - videos take 30-60 seconds to generate")
        elif not video_models:
            print("\n❌ Veo 3.1 not available on your account")
            print("Solution: Upgrade to paid tier at https://aistudio.google.com/billing")
        else:
            print("\n⚠️ Veo 3.1 available but generation failed")
            print("Check the error message above")

    except Exception as e:
        print(f"   ❌ Failed to create video: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(diagnose_veo())