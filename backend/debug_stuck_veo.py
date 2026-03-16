#!/usr/bin/env python3
"""
Debug stuck Veo operation
Check what's actually in the response when operation is done but no video
"""

import os
import asyncio
from dotenv import load_dotenv
from google import genai
import json

load_dotenv()

async def debug_operation():
    # The stuck job ID from the logs
    job_id = "models/veo-3.1-fast-generate-preview/operations/uozt5hehqmmr"

    api_key = os.environ.get("VEO_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("No API key found")
        return

    client = genai.Client(api_key=api_key)

    print(f"Checking operation: {job_id}")
    print("=" * 60)

    try:
        # Get the operation
        operation = client.operations._get_videos_operation(operation_name=job_id)

        # Print the full response
        print("Full operation response:")
        print(json.dumps(operation, indent=2, default=str))

        # Check specific fields
        if isinstance(operation, dict):
            is_done = operation.get('done', False)
            print(f"\nOperation done: {is_done}")

            if 'error' in operation:
                print(f"ERROR found: {operation['error']}")

            if 'response' in operation:
                response = operation['response']
                print("\nResponse structure:")
                print(f"Keys: {response.keys() if isinstance(response, dict) else 'Not a dict'}")

                if 'generateVideoResponse' in response:
                    gen_response = response['generateVideoResponse']
                    print(f"\ngenerateVideoResponse keys: {gen_response.keys()}")

                    if 'generatedSamples' in gen_response:
                        samples = gen_response['generatedSamples']
                        print(f"Number of samples: {len(samples)}")
                        if samples:
                            print("First sample:")
                            print(json.dumps(samples[0], indent=2, default=str))

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(debug_operation())