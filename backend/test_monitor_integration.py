#!/usr/bin/env python3
"""
Integration test for Chanakya monitoring system.
Tests all core functions without triggering actual production.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


async def test_monitor_system():
    """Test all monitor functions."""
    print("=" * 70)
    print("CHANAKYA MONITOR - INTEGRATION TEST")
    print("=" * 70)
    print()

    try:
        from monitor_chanakya import ChanakyaMonitor

        print("✓ Monitor class imported successfully")

        # Initialize monitor
        monitor = ChanakyaMonitor()
        print("✓ Monitor initialized (environment verified)")
        print()

        # Test 1: Check status
        print("[TEST 1] Checking production status (last 24 hours)...")
        status = await monitor.check_status(hours=24)
        print(f"✓ Status check complete:")
        print(f"  - Total submissions: {status['total']}")
        print(f"  - Completed: {status['completed']}")
        print(f"  - Failed: {status['failed']}")
        print(f"  - Status breakdown: {status['by_status']}")
        print()

        # Test 2: Check status (last 7 days)
        print("[TEST 2] Checking production status (last 7 days)...")
        status_7d = await monitor.check_status(hours=168)
        print(f"✓ Extended status check complete:")
        print(f"  - Total submissions: {status_7d['total']}")
        print()

        # Test 3: Check recent failures
        print("[TEST 3] Checking for recent failures...")
        failures = await monitor.check_recent_failures(hours=24)
        print(f"✓ Failure check complete:")
        print(f"  - Found {len(failures)} failure(s) in last 24 hours")
        print()

        # Test 4: Verify YouTube upload (only if submissions exist)
        if status['total'] > 0 and status['submissions']:
            print("[TEST 4] Verifying YouTube upload...")
            latest_sub = status['submissions'][0]
            verify_result = await monitor.verify_youtube_upload(latest_sub['id'])
            print(f"✓ YouTube verification complete:")
            print(f"  - Status: {verify_result['status']}")
            if verify_result.get('youtube_url'):
                print(f"  - URL: {verify_result['youtube_url']}")
            print()
        else:
            print("[TEST 4] Skipped - no submissions to verify")
            print()

        # Test 5: Database connections
        print("[TEST 5] Testing database connections...")
        sub_count = await monitor.submissions_db.count_documents({
            "clientId": "chanakya-sutra"
        })
        print(f"✓ Submissions collection: {sub_count} total records")

        task_count = await monitor.video_tasks_db.count_documents({
            "clientId": "chanakya-sutra"
        })
        print(f"✓ Video tasks collection: {task_count} total records")

        idea_count = await monitor.ideas_db.count_documents({
            "clientId": "chanakya-sutra"
        })
        print(f"✓ Ideas collection: {idea_count} total records")
        print()

        print("=" * 70)
        print("ALL TESTS PASSED ✓")
        print("=" * 70)
        print()
        print("Monitor system is fully operational.")
        print()
        print("Next steps:")
        print("  1. Trigger production: python3 monitor_chanakya.py trigger --format short")
        print("  2. Check status: python3 monitor_chanakya.py status")
        print("  3. Monitor Railway logs: railway logs --tail")
        print()

        return True

    except ImportError as e:
        print(f"✗ Import error: {e}")
        print("  Check that all dependencies are installed")
        return False

    except Exception as e:
        print(f"✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_monitor_system())
    sys.exit(0 if success else 1)
