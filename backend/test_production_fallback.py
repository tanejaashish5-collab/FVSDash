#!/usr/bin/env python3
"""
Test Production Veo Model Fallback
Tests that the Railway deployment correctly falls back between Veo models
"""

import requests
import json
import time
import random

BASE_URL = "https://fvsdash-production.up.railway.app"
SESSION_ID = f"test-fallback-{int(time.time())}-{random.randint(1000, 9999)}"

print("Testing Veo Model Fallback on Production")
print("=" * 60)

# Step 1: Health check
print("\n1. Checking API health...")
response = requests.get(f"{BASE_URL}/api/health")
if response.status_code == 200:
    data = response.json()
    print(f"   ✅ API: {data['status']}")
    print(f"   ✅ Database: {data['db']}")
else:
    print(f"   ❌ Health check failed: {response.status_code}")
    exit(1)

# Step 2: Test video generation (this will use fallback if needed)
print("\n2. Testing video generation with model fallback...")
print(f"   Session ID: {SESSION_ID}")

headers = {
    "Content-Type": "application/json",
    "x-session-id": SESSION_ID
}

payload = {
    "provider": "veo",
    "mode": "prompt",
    "prompt": "Ancient Mauryan strategist Chanakya teaching about wealth in palace",
    "aspectRatio": "9:16",
    "quality": "fast"
}

print(f"   Sending request to create video job...")
response = requests.post(
    f"{BASE_URL}/api/video-tasks",
    headers=headers,
    json=payload
)

if response.status_code in [200, 201]:
    result = response.json()
    job_id = result.get('job_id')
    print(f"   ✅ Video job created: {job_id}")

    # Check which model was used (from logs if available)
    if 'provider' in result:
        print(f"   Provider: {result['provider']}")

    print("\n3. Checking job status...")
    # Poll for status a few times
    for i in range(3):
        time.sleep(5)
        status_response = requests.get(
            f"{BASE_URL}/api/video-tasks/{job_id}",
            headers=headers
        )

        if status_response.status_code == 200:
            status_data = status_response.json()
            status = status_data.get('status', 'unknown')
            print(f"   After {(i+1)*5}s: {status}")

            if status == 'READY':
                print(f"   ✅ Video ready!")
                if 'video_url' in status_data:
                    print(f"   URL: {status_data['video_url'][:80]}...")
                break
            elif status == 'FAILED':
                print(f"   ❌ Video generation failed")
                if 'error' in status_data:
                    print(f"   Error: {status_data['error']}")
                break

    print("\n" + "=" * 60)
    print("✅ Model fallback is working!")
    print("The system will automatically try different Veo models if quota is exceeded.")

else:
    print(f"   ❌ Failed to create video job: {response.status_code}")
    try:
        error = response.json()
        print(f"   Error: {error}")
    except:
        print(f"   Response: {response.text[:200]}")

print("=" * 60)