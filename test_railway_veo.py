#!/usr/bin/env python3
"""Test if Railway has Veo configured correctly."""

import requests
import json
import time

# Railway backend URL
API_URL = "https://fvsdash-production.up.railway.app"

def test_veo_generation():
    """Test video generation on Railway."""

    print("Testing Veo on Railway backend...")
    print(f"API: {API_URL}")
    print("-" * 50)

    # Create a test video task
    payload = {
        "provider": "veo",
        "mode": "prompt",
        "prompt": "Ancient sage Chanakya teaching about wealth",
        "aspectRatio": "9:16",
        "quality": "fast"
    }

    headers = {
        "Content-Type": "application/json",
        "x-session-id": "test-session-" + str(int(time.time()))
    }

    print("1. Creating video task...")
    print(f"   Payload: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(
            f"{API_URL}/api/video-tasks",
            json=payload,
            headers=headers,
            timeout=30
        )

        print(f"\n2. Response status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success!")
            print(f"   Task ID: {data.get('id') or data.get('task_id')}")
            print(f"   Provider: {data.get('provider')}")
            print(f"   Is Mocked: {data.get('isMocked', False)}")

            if data.get('isMocked'):
                print("\n   ⚠️  Response is mocked - API key may not be configured")
                print("   Check Railway environment variables for GEMINI_API_KEY")
            else:
                print("\n   ✅ Real Veo generation started!")
                print("   Video will be ready in 1-3 minutes")

            return data

        else:
            print(f"   ❌ Error: {response.status_code}")
            error_data = response.json()
            print(f"   Message: {error_data}")

            if "Not authenticated" in str(error_data):
                print("\n   Note: Authentication error is normal for test")
                print("   Try from the actual Content Studio UI")

    except Exception as e:
        print(f"   ❌ Request failed: {e}")

    return None

if __name__ == "__main__":
    test_veo_generation()

    print("\n" + "=" * 50)
    print("Next steps:")
    print("1. If mocked: Add GEMINI_API_KEY to Railway variables")
    print("2. If authenticated error: Login to Content Studio")
    print("3. Try at: https://fvs-dash.vercel.app/dashboard/studio")