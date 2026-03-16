#!/usr/bin/env python3
"""Check a stuck Veo video job directly."""

import asyncio
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment
load_dotenv('/Users/ashishtaneja/Desktop/FVS/backend/.env')

async def check_stuck_video():
    """Check what's happening with a stuck video job."""

    from google import genai

    api_key = os.environ.get('GEMINI_API_KEY')
    client = genai.Client(api_key=api_key)

    # You can replace this with the actual job ID from Railway logs
    print("Enter the Veo job ID (e.g., models/veo-3.1-fast-generate-preview/operations/xxxxx)")
    print("You can find this in Railway logs when the video was created")
    print("Or press Enter to create a new test job:")

    job_id = input().strip()

    if not job_id:
        # Create a new test job
        print("\nCreating new test job...")
        from google.genai import types

        operation = client.models.generate_videos(
            model="veo-3.1-fast-generate-preview",
            prompt="Test: Ancient sage Chanakya in palace",
            config=types.GenerateVideosConfig(
                aspect_ratio="9:16",
                number_of_videos=1,
                duration_seconds=8,
            ),
        )
        job_id = operation.name
        print(f"Created job: {job_id}")

    print(f"\nChecking job: {job_id}")
    print("-" * 60)

    # Check status multiple times
    for i in range(20):  # Check for up to 100 seconds
        try:
            # Get operation status
            operation = client.operations._get_videos_operation(operation_name=job_id)

            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Check #{i+1}:")

            if isinstance(operation, dict):
                is_done = operation.get('done', False)
                print(f"  Done: {is_done}")

                if operation.get('error'):
                    print(f"  ❌ ERROR: {operation['error']}")
                    break

                if operation.get('response'):
                    response = operation['response']
                    videos = response.get('generatedVideos', [])

                    if videos:
                        print(f"  ✅ Videos found: {len(videos)}")
                        video = videos[0]
                        video_data = video.get('video', {})
                        url = video_data.get('uri') or video_data.get('url')

                        if url:
                            print(f"  ✅ Video URL: {url[:80]}...")
                            return url
                        else:
                            print(f"  ⚠️  Video object exists but no URL yet")
                            print(f"      Video data keys: {list(video_data.keys())}")
                    else:
                        print(f"  ⚠️  Response exists but no videos yet")
                        print(f"      Response keys: {list(response.keys())}")
                else:
                    if is_done:
                        print(f"  ⚠️  Operation done but no response")
                        print(f"      Operation keys: {list(operation.keys())}")
                    else:
                        print(f"  ⏳ Still processing...")

            if not is_done:
                await asyncio.sleep(5)
            else:
                # If done but no video, wait a bit and check again
                await asyncio.sleep(3)

        except Exception as e:
            print(f"  ❌ Error checking status: {e}")
            break

    print("\n" + "=" * 60)
    print("Check complete. If stuck in processing:")
    print("1. The video might be queued (Veo can take 2-5 minutes)")
    print("2. The API key might not have Veo access (needs paid tier)")
    print("3. The prompt might be too complex or violating content policy")

if __name__ == "__main__":
    asyncio.run(check_stuck_video())