#!/usr/bin/env python3
"""Inspect the actual Veo response structure."""

import asyncio
import os
import json
from dotenv import load_dotenv

# Load environment
load_dotenv('/Users/ashishtaneja/Desktop/FVS/backend/.env')

async def inspect_response():
    """Create a job and inspect the full response."""

    from google import genai
    from google.genai import types

    api_key = os.environ.get('GEMINI_API_KEY')
    client = genai.Client(api_key=api_key)

    # Create a test job
    print("Creating test job...")
    operation = client.models.generate_videos(
        model="veo-3.1-fast-generate-preview",
        prompt="Test: Ancient sage Chanakya",
        config=types.GenerateVideosConfig(
            aspect_ratio="9:16",
            number_of_videos=1,
            duration_seconds=8,
        ),
    )

    job_id = operation.name
    print(f"Job ID: {job_id}")
    print("\nWaiting for completion...")

    # Wait for it to be done
    for i in range(30):
        await asyncio.sleep(5)

        # Get operation status
        op = client.operations._get_videos_operation(operation_name=job_id)

        if isinstance(op, dict) and op.get('done'):
            print(f"\nOperation done after {(i+1)*5} seconds")
            print("\nFull response structure:")
            print(json.dumps(op, indent=2, default=str))

            # Try to find the video URL in the response
            print("\n" + "=" * 60)
            print("Looking for video URL...")

            response = op.get('response', {})

            # Check different possible paths
            if 'generateVideoResponse' in response:
                gen_response = response['generateVideoResponse']
                print(f"Found generateVideoResponse: {type(gen_response)}")
                if isinstance(gen_response, dict):
                    print(f"Keys: {list(gen_response.keys())}")

                    # Check for videos
                    if 'generatedVideos' in gen_response:
                        videos = gen_response['generatedVideos']
                        print(f"Found videos: {len(videos)}")
                        if videos:
                            video = videos[0]
                            print(f"Video keys: {list(video.keys())}")
                            if 'video' in video:
                                video_data = video['video']
                                print(f"Video data keys: {list(video_data.keys())}")
                                url = video_data.get('uri') or video_data.get('url')
                                if url:
                                    print(f"\n✅ VIDEO URL FOUND: {url}")
                                    return url

            # If we got here, no video was found
            print("\n⚠️ Operation done but no video URL in response")
            print("This might mean:")
            print("1. Video generation failed silently")
            print("2. Response structure is different than expected")
            print("3. Need to wait longer for video to be available")

            break

        print(f"Still processing... ({(i+1)*5}s)")

if __name__ == "__main__":
    asyncio.run(inspect_response())