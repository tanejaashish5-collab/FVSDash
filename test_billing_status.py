#!/usr/bin/env python3
"""Check if API key has billing enabled and quota."""

import os
from google import genai

# Test with your API key
api_key = input("Enter your API key to test: ").strip()

if not api_key:
    print("No key provided")
    exit(1)

print(f"\nTesting API key: {api_key[:20]}...{api_key[-4:]}")
print("-" * 60)

try:
    client = genai.Client(api_key=api_key)

    # Test 1: Can we connect?
    print("1. Connection test: ", end="")
    print("✅ Connected")

    # Test 2: List models
    print("2. Models available: ", end="")
    models = list(client.models.list())
    veo_models = [m.name for m in models if 'veo' in m.name.lower()]
    if veo_models:
        print(f"✅ {len(veo_models)} Veo models")
    else:
        print("❌ No Veo models (free tier)")

    # Test 3: Try to create a video
    print("3. Video generation test: ", end="")
    from google.genai import types

    try:
        operation = client.models.generate_videos(
            model="veo-3.1-fast-generate-preview",
            prompt="Test: simple shape",
            config=types.GenerateVideosConfig(
                aspect_ratio="9:16",
                number_of_videos=1,
                duration_seconds=4,  # Minimum duration
            ),
        )
        print(f"✅ Created job: {operation.name}")
        print("\n🎉 THIS API KEY HAS BILLING ENABLED!")
        print("   Use this key in Railway")

    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
            print("❌ Quota exceeded")
            print("\n⚠️  This key has exceeded its quota")
            print("   Either:")
            print("   - It's a free tier key (very limited)")
            print("   - Billing is enabled but quota used up")
            print("   - Check: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas")
        elif "403" in str(e) or "Permission" in str(e):
            print("❌ No access to Veo")
            print("\n⚠️  This key doesn't have Veo access")
            print("   Need to enable billing on this project")
        else:
            print(f"❌ Error: {str(e)[:100]}")

except Exception as e:
    print(f"❌ Connection failed: {e}")

print("\n" + "=" * 60)
print("Summary:")
print("- If you see '429 Quota exceeded' - wrong project or quota used")
print("- If you see 'No Veo models' - billing not enabled")
print("- If you see 'Created job' - this key is good to use!")
print("=" * 60)