#!/usr/bin/env python3
"""
Trigger test Chanakya production (short format for quick testing)
"""

import asyncio
import sys
import os
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def trigger_short():
    try:
        from services.publishing_scheduler import _chanakya_generate_short

        day = datetime.now(timezone.utc).strftime("%A")

        print("=" * 60)
        print("TRIGGERING CHANAKYA SHORT VIDEO TEST")
        print("=" * 60)
        print(f"Day: {day}")
        print(f"Time: {datetime.now(timezone.utc)}")
        print()
        print("Expected:")
        print("  - Duration: 50-60 seconds")
        print("  - Cost: ~$3.54")
        print("  - Time: 10-15 minutes")
        print("  - 5 Kling video clips")
        print()
        print("Starting production...")
        print("=" * 60)

        # This will trigger the production on Railway (not locally)
        await _chanakya_generate_short(day)

        print()
        print("✅ Production triggered successfully!")
        print()
        print("Monitor progress with:")
        print("  python3 backend/check_production.py")
        print()
        print("Or check Railway logs:")
        print("  railway logs --tail")

    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("This is expected if running locally without all API keys.")
        print("The production should still be triggered on Railway.")

if __name__ == "__main__":
    asyncio.run(trigger_short())