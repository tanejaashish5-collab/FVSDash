# Chanakya Monitor - Usage Examples

Real-world usage examples for the Chanakya monitoring system.

## Example 1: Daily Production Check

**Scenario**: Every morning, check yesterday's automated production

```bash
cd /Users/ashishtaneja/Desktop/FVS/backend

# Check last 24 hours
python3 monitor_chanakya.py status --hours 24
```

**Expected Output**:
```
======================================================================
CHANAKYA STATUS CHECK - LAST 24 HOURS
======================================================================
Found 2 submission(s)

Status Summary:
  COMPLETED: 2

Completed Videos (2):
  - Chanakya on Office Politics: The Silent Weapon
    ID: sub_abc123
    Created: 2026-03-17T14:30:00Z
    YouTube: https://youtube.com/watch?v=dQw4w9WgXcQ

  - The Art of Strategic Patience - Ancient Wisdom
    ID: sub_def456
    Created: 2026-03-18T02:30:00Z
    YouTube: https://youtube.com/watch?v=xvFZjo5PgG0
```

## Example 2: Manual Trigger for Testing

**Scenario**: Testing a new prompt or content idea before scheduled run

```bash
# Trigger short video and watch progress
python3 monitor_chanakya.py trigger --format short
```

**Live Progress Output**:
```
======================================================================
TRIGGERING CHANAKYA SHORT PRODUCTION
======================================================================
Starting short production for Tuesday
Current submissions count: 145
Start time: 2026-03-18T03:00:00Z
Production task created successfully
Monitoring production progress...

[2026-03-18 03:00:15] [PROGRESS] 1 idea(s) generated
[2026-03-18 03:00:30] [PROGRESS] Submission created: Chanakya vs Sun Tzu on War
[2026-03-18 03:00:30]             ID: sub_xyz789
[2026-03-18 03:00:30]             Status: PROCESSING
[2026-03-18 03:01:00] [PROGRESS] Video task: PROCESSING
[2026-03-18 03:01:00]             Type: video_generation
[2026-03-18 03:01:00]             Provider: kling
[2026-03-18 03:12:45] PRODUCTION COMPLETE!
======================================================================
Time elapsed: 765 seconds (12.8 minutes)
Submission ID: sub_xyz789
Title: Chanakya vs Sun Tzu on War
Video URL: https://storage.googleapis.com/fvs/chanakya/xyz789.mp4
Status: COMPLETED
YouTube ID: aBcDeFgHiJk
YouTube URL: https://youtube.com/watch?v=aBcDeFgHiJk
```

## Example 3: Handling Production Failure

**Scenario**: Scheduled run failed due to API timeout

```bash
# Step 1: Check what failed
python3 monitor_chanakya.py status --hours 2

# Output shows failure
# Status Summary:
#   FAILED: 1
#
# Failed Productions (1):
#   - Upanishads and Modern Psychology
#     ID: sub_fail123
#     Error: Kling API timeout after 300 seconds

# Step 2: Retry the failed submission
python3 monitor_chanakya.py retry --submission-id sub_fail123
```

**Retry Output**:
```
======================================================================
RETRYING SUBMISSION: sub_fail123
======================================================================
Found submission: Upanishads and Modern Psychology
Current status: FAILED
Found idea: Upanishads and Modern Psychology
Retrying with mode: full_auto_short
Retry completed successfully
New submission: sub_retry456
```

## Example 4: Batch Retry All Failures

**Scenario**: Multiple failures over the weekend, bulk retry on Monday

```bash
# Check failures from last 72 hours (weekend)
python3 monitor_chanakya.py status --hours 72

# Auto-retry all failures with max 3 attempts
python3 monitor_chanakya.py auto-retry --hours 72 --max-retries 3
```

**Output**:
```
======================================================================
AUTO-RETRY FAILURES - LAST 72 HOURS
======================================================================
Found 3 failure(s) in last 72 hours
  - Ancient Wealth Creation Principles
    ID: sub_fail1
    Error: ElevenLabs rate limit exceeded
  - Chanakya AI Mastery for Entrepreneurs
    ID: sub_fail2
    Error: MongoDB connection timeout
  - Dark Psychology in Business Negotiations
    ID: sub_fail3
    Error: Kling API service unavailable

Retrying sub_fail1 (attempt 1/3)
✓ Retry succeeded
Waiting 60 seconds before next retry...

Retrying sub_fail2 (attempt 1/3)
✓ Retry succeeded
Waiting 60 seconds before next retry...

Retrying sub_fail3 (attempt 1/3)
✗ Retry failed: Kling API still unavailable

======================================================================
AUTO-RETRY COMPLETE
======================================================================
Total retried: 3
Succeeded: 2
Failed: 1
```

## Example 5: Verify YouTube Upload

**Scenario**: Video produced but need to confirm YouTube upload

```bash
python3 monitor_chanakya.py verify --submission-id sub_abc123
```

**Output**:
```
Verifying YouTube upload for: sub_abc123
YouTube video ID: dQw4w9WgXcQ
YouTube URL: https://youtube.com/watch?v=dQw4w9WgXcQ
✓ Video uploaded: https://youtube.com/watch?v=dQw4w9WgXcQ
```

## Example 6: Railway Production Trigger

**Scenario**: Triggering production from Railway console

```bash
# SSH into Railway
railway run bash

# Navigate to backend
cd backend

# Trigger long-form without waiting (returns immediately)
python3 monitor_chanakya.py trigger --format longform --no-wait

# Exit Railway
exit

# Monitor from local machine
railway logs --tail | grep Chanakya
```

**Railway Logs**:
```
2026-03-18 14:30:00 | [Chanakya Tuesday] Starting Long-form generation...
2026-03-18 14:30:05 | [Chanakya Tuesday] Generating Long-form...
2026-03-18 14:30:10 | [Chanakya Tuesday] Producing long-form: 'Arthashastra for Startups'
2026-03-18 14:45:30 | [Chanakya Tuesday] ✅ Long-form completed: Arthashastra for Startups
2026-03-18 14:45:35 | [Chanakya Tuesday] Uploading long-form video to YouTube...
2026-03-18 14:47:20 | [Chanakya Tuesday] ✅ Long-form uploaded to YouTube: xYz123AbC
```

## Example 7: Weekly Performance Review

**Scenario**: Monday morning review of last week's production

```bash
# Check last 7 days
python3 monitor_chanakya.py status --hours 168
```

**Analysis Output**:
```
======================================================================
CHANAKYA STATUS CHECK - LAST 168 HOURS
======================================================================
Found 7 submission(s)

Status Summary:
  COMPLETED: 7

Completed Videos (7):
  [Week of March 11-17, 2026]

  Mon Mar 11 - Short: "Chanakya on Office Politics"
  Tue Mar 12 - Long: "Arthashastra for Startup Founders"
  Wed Mar 13 - Short: "Ancient Persuasion Techniques"
  Thu Mar 14 - Long: "Upanishads and Self-Mastery"
  Fri Mar 15 - Short: "Chanakya vs Machiavelli on Power"
  Sat Mar 16 - Short: "Reading People: Ancient Wisdom"
  Sun Mar 17 - Long: "Vedic Psychology for Modern Life"

All scheduled videos produced successfully! ✓
Total cost: ~$23.50 (4 shorts + 3 long-forms)
```

## Example 8: Pre-Scheduled Run Check

**Scenario**: 30 minutes before scheduled run, verify system ready

```bash
# Check API credits are sufficient
echo "Checking system readiness..."

# 1. Check recent status (should be empty or last run complete)
python3 monitor_chanakya.py status --hours 2

# 2. Verify no stuck productions
# (If status shows PROCESSING from >2 hours ago, investigate)

# 3. Check database connection
python3 test_monitor_integration.py

# 4. Monitor Railway logs during scheduled time
railway logs --tail
```

## Example 9: Cost Tracking Monthly

**Scenario**: End of month, calculate total costs

```bash
# Get all March 2026 productions
python3 monitor_chanakya.py status --hours 720  # 30 days

# Count by format
python3 << EOF
import asyncio
from monitor_chanakya import ChanakyaMonitor
from datetime import datetime, timedelta, timezone

async def monthly_report():
    monitor = ChanakyaMonitor()

    # Last 30 days
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    submissions = await monitor.submissions_db.find({
        "clientId": "chanakya-sutra",
        "createdAt": {"\\$gte": cutoff.isoformat()},
        "status": "COMPLETED"
    }).to_list(100)

    shorts = [s for s in submissions if s.get("duration", 0) < 120]
    longforms = [s for s in submissions if s.get("duration", 0) >= 120]

    short_cost = len(shorts) * 3.54
    long_cost = len(longforms) * 2.47
    total = short_cost + long_cost

    print(f"March 2026 Production Report")
    print(f"===========================")
    print(f"Shorts: {len(shorts)} × \\$3.54 = \\${short_cost:.2f}")
    print(f"Long-forms: {len(longforms)} × \\$2.47 = \\${long_cost:.2f}")
    print(f"TOTAL: \\${total:.2f}")
    print(f"\\nBudget: \\$86.28")
    print(f"Actual: \\${total:.2f}")
    print(f"Variance: \\${total - 86.28:.2f}")

asyncio.run(monthly_report())
EOF
```

**Output**:
```
March 2026 Production Report
===========================
Shorts: 16 × $3.54 = $56.64
Long-forms: 12 × $2.47 = $29.64
TOTAL: $86.28

Budget: $86.28
Actual: $86.28
Variance: $0.00
```

## Example 10: Emergency Production Stop

**Scenario**: API key compromised, need to stop all production

```bash
# Step 1: Stop any in-progress production
railway restart

# Step 2: Check what was running
python3 monitor_chanakya.py status --hours 2

# Step 3: Mark in-progress submissions as failed
python3 << EOF
import asyncio
from monitor_chanakya import ChanakyaMonitor
from datetime import datetime, timezone

async def emergency_stop():
    monitor = ChanakyaMonitor()

    # Find any PROCESSING submissions
    processing = await monitor.submissions_db.find({
        "clientId": "chanakya-sutra",
        "status": "PROCESSING"
    }).to_list(100)

    for sub in processing:
        await monitor.submissions_db.update_one(
            {"id": sub["id"]},
            {"\\$set": {
                "status": "FAILED",
                "errorMessage": "Emergency stop - manual intervention",
                "updatedAt": datetime.now(timezone.utc).isoformat()
            }}
        )
        print(f"Stopped: {sub['id']}")

asyncio.run(emergency_stop())
EOF

# Step 4: Rotate API keys
# Step 5: Resume when safe
```

## Example 11: Quality Spot Check

**Scenario**: Random quality verification of recent video

```bash
# Get latest submission
python3 << EOF
import asyncio
from monitor_chanakya import ChanakyaMonitor

async def spot_check():
    monitor = ChanakyaMonitor()

    latest = await monitor.submissions_db.find_one(
        {"clientId": "chanakya-sutra", "status": "COMPLETED"},
        {"_id": 0},
        sort=[("createdAt", -1)]
    )

    if latest:
        print(f"Latest Video:")
        print(f"  Title: {latest.get('title')}")
        print(f"  Created: {latest.get('createdAt')}")
        print(f"  Duration: {latest.get('duration')}s")
        print(f"  Video URL: {latest.get('sourceFileUrl')}")
        if latest.get('youtubeVideoId'):
            print(f"  YouTube: https://youtube.com/watch?v={latest['youtubeVideoId']}")
        print(f"\\nManual checklist:")
        print(f"  [ ] Video plays correctly")
        print(f"  [ ] Audio quality acceptable")
        print(f"  [ ] Captions accurate")
        print(f"  [ ] Visuals match content")
        print(f"  [ ] Thumbnail appropriate")

asyncio.run(spot_check())
EOF
```

## Example 12: Integration with Other Systems

**Scenario**: Trigger Chanakya production from external scheduler (cron)

```bash
# crontab entry for Saturday 8 PM IST
# 30 14 * * 6 cd /path/to/backend && python3 monitor_chanakya.py trigger --format short --no-wait

# Or use Railway scheduler
# Add to Railway cron configuration:
{
  "schedule": "30 14 * * 6",
  "command": "cd backend && python3 monitor_chanakya.py trigger --format short --no-wait"
}
```

## Tips & Best Practices

### 1. Always Check Status First
```bash
# Before triggering, check recent activity
python3 monitor_chanakya.py status --hours 4
```

### 2. Use --no-wait for Background
```bash
# If you need to close terminal
python3 monitor_chanakya.py trigger --format short --no-wait

# Check later
python3 monitor_chanakya.py status --hours 1
```

### 3. Monitor Railway Logs During Production
```bash
# In separate terminal
railway logs --tail | grep -i "chanakya\|error\|failed"
```

### 4. Retry Immediately After Failure
```bash
# Failed submissions are cheaper to retry immediately
# (Uses same idea, avoids re-running idea generation)
python3 monitor_chanakya.py retry --submission-id <id>
```

### 5. Weekly Batch Operations
```bash
# Monday morning routine
python3 monitor_chanakya.py status --hours 168  # Review last week
python3 monitor_chanakya.py auto-retry --hours 168  # Retry failures
```

### 6. Cost-Conscious Testing
```bash
# Test in development first, not production
# Use smaller batches for testing
# Monitor costs daily during initial rollout
```

## Common Patterns

### Pattern 1: Morning Check Routine
```bash
cd /Users/ashishtaneja/Desktop/FVS/backend
python3 monitor_chanakya.py status --hours 24
# Review output, verify uploads, check for failures
```

### Pattern 2: Before/After Scheduled Run
```bash
# Before (15 min prior)
python3 test_monitor_integration.py

# During
railway logs --tail

# After (5 min later)
python3 monitor_chanakya.py verify --submission-id <latest-id>
```

### Pattern 3: Weekly Maintenance
```bash
# Every Monday
python3 monitor_chanakya.py status --hours 168
python3 monitor_chanakya.py auto-retry --hours 168
# Review costs
# Check API credits
```

## See Also

- Full documentation: `CHANAKYA_MONITORING.md`
- Quick reference: `CHANAKYA_QUICKSTART.md`
- Deployment guide: `CHANAKYA_DEPLOYMENT_CHECKLIST.md`
