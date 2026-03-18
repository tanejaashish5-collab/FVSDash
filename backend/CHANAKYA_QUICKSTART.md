# Chanakya Monitor - Quick Reference

One-page cheat sheet for Chanakya video production monitoring.

## Database Connection

MongoDB: `mongodb+srv://tanejaashish5_db_user:Atlas007@forgevoice.x0ngmvf.mongodb.net/forgevoice_prod`

Collections:
- `submissions` - Video submissions and status
- `video_tasks` - Individual generation tasks
- `fvs_ideas` - Content ideas

## Common Commands

### Trigger Production

```bash
# Short video (50-60s, $3.50, 15 min)
python3 monitor_chanakya.py trigger --format short

# Long-form video (6 min, $2.25, 25 min)
python3 monitor_chanakya.py trigger --format longform

# Trigger and return immediately
python3 monitor_chanakya.py trigger --format short --no-wait
```

### Check Status

```bash
# Last 24 hours
python3 monitor_chanakya.py status

# Last 7 days
python3 monitor_chanakya.py status --hours 168

# Last 30 days
python3 monitor_chanakya.py status --hours 720
```

### Retry Failed

```bash
# Retry specific submission
python3 monitor_chanakya.py retry --submission-id <SUBMISSION_ID>

# Auto-retry all failures from last 24 hours
python3 monitor_chanakya.py auto-retry

# Auto-retry from last 48 hours, max 5 attempts
python3 monitor_chanakya.py auto-retry --hours 48 --max-retries 5
```

### Verify YouTube

```bash
python3 monitor_chanakya.py verify --submission-id <SUBMISSION_ID>
```

## Railway Production

### SSH into Railway

```bash
railway run bash
```

### Trigger from Railway

```bash
cd backend
python3 monitor_chanakya.py trigger --format short --no-wait
```

### Check Railway Logs

```bash
railway logs --tail
```

### Monitor from Railway

```bash
# In Railway container
python3 monitor_chanakya.py status
```

## Admin API Endpoint

Production API: `https://fvsdash-production.up.railway.app`

### Trigger via API

```bash
# Short video
curl -X POST https://fvsdash-production.up.railway.app/admin/chanakya/trigger?format=short \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Long-form video
curl -X POST https://fvsdash-production.up.railway.app/admin/chanakya/trigger?format=longform \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

## Direct MongoDB Queries

### Check Recent Submissions

```javascript
db.submissions.find({
  clientId: "chanakya-sutra",
  createdAt: { $gte: "2026-03-18T00:00:00Z" }
}).sort({ createdAt: -1 })
```

### Count by Status

```javascript
db.submissions.aggregate([
  { $match: { clientId: "chanakya-sutra" } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Find Failures

```javascript
db.submissions.find({
  clientId: "chanakya-sutra",
  status: "FAILED"
}).sort({ createdAt: -1 })
```

### Check YouTube Uploads

```javascript
db.submissions.find({
  clientId: "chanakya-sutra",
  youtubeVideoId: { $exists: true, $ne: null }
}).sort({ createdAt: -1 })
```

## Production Schedule

Automated runs at 8 PM IST (2:30 PM UTC):

**Shorts (4×/week)**
- Saturday 8 PM IST
- Monday 8 PM IST
- Wednesday 8 PM IST
- Friday 8 PM IST

**Long-form (3×/week)**
- Sunday 8 PM IST
- Tuesday 8 PM IST
- Thursday 8 PM IST

## Cost Calculator

**Short Video**: ~$3.54
- 5 Kling clips: $3.50
- ElevenLabs (60s): $0.03
- Gemini script: $0.01

**Long-Form Video**: ~$2.47
- 3 Kling clips: $2.10
- 33 AI images: $0.17
- ElevenLabs (360s): $0.18
- Gemini script: $0.02

**Monthly Total** (7×/week):
- 16 shorts: $56.64
- 12 long-forms: $29.64
- **Total**: $86.28/month

## Status Codes

**Submission Status**
- `DRAFT` - Initial creation
- `PROCESSING` - Video generation in progress
- `SCHEDULED` - Video ready, pending upload
- `COMPLETED` - Uploaded successfully
- `FAILED` - Production error

**Video Task Status**
- `pending` - Queued
- `processing` - In progress
- `completed` - Done
- `failed` - Error

## Troubleshooting

### Production Stuck

```bash
# Check what's happening
python3 monitor_chanakya.py status --hours 2

# Check Railway logs
railway logs --tail

# If stuck >30 min, retry
python3 monitor_chanakya.py retry --submission-id <ID>
```

### YouTube Upload Failed

```bash
# Verify submission exists
python3 monitor_chanakya.py verify --submission-id <ID>

# Check MongoDB for error
db.submissions.findOne({ id: "<ID>" })

# Manual upload from submission.sourceFileUrl if needed
```

### High API Costs

```bash
# Check how many ran today
python3 monitor_chanakya.py status --hours 24

# Look for duplicates or failures
db.submissions.find({
  clientId: "chanakya-sutra",
  createdAt: { $gte: "<TODAY>" }
}).count()
```

## Environment Variables (Railway)

Required:
- `MONGO_URL` - MongoDB connection
- `DB_NAME` - Database name
- `FAL_KEY` - Fal.ai API key
- `GEMINI_API_KEY` - Google Gemini
- `ELEVENLABS_API_KEY` - ElevenLabs
- `YOUTUBE_CLIENT_ID` - YouTube OAuth
- `YOUTUBE_CLIENT_SECRET` - YouTube OAuth

## Quick Monitoring Loop

```bash
# Watch for new submissions (run in separate terminal)
watch -n 10 'python3 monitor_chanakya.py status --hours 1'

# Or on Railway
while true; do
  python3 monitor_chanakya.py status --hours 1
  sleep 30
done
```

## Alert Setup (Optional)

### Slack Webhook

Add to monitor script:

```python
# In _monitor_production() on failure
import requests
requests.post(
    "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    json={"text": f"Chanakya production failed: {submission_id}"}
)
```

### Email Alert

```python
# On failure
from services.email_service import send_email
await send_email(
    to="ashish@example.com",
    subject="Chanakya Production Failed",
    body=f"Submission {submission_id} failed: {error}"
)
```

## Emergency Stops

### Stop All Production

```bash
# Kill any running background tasks (if needed)
# This is safe - scheduler will resume on next interval
railway ps
railway restart
```

### Pause Scheduler

Edit `/backend/services/publishing_scheduler.py`:

```python
# Comment out Chanakya jobs temporarily
# _scheduler.add_job(chanakya_short_content, ...)
```

Then redeploy:

```bash
git commit -am "Pause Chanakya automation"
git push
```

## Best Practices

1. **Before triggering**:
   - Check API credits
   - Verify last production succeeded
   - Test with `status` first

2. **After triggering**:
   - Monitor Railway logs
   - Verify submission created
   - Check YouTube upload

3. **Daily checks**:
   - Run `status` to verify schedule
   - Check MongoDB for failures
   - Review API costs

4. **Weekly maintenance**:
   - Auto-retry any failures
   - Review production quality
   - Check analytics on YouTube

## File Locations

- Monitor script: `/backend/monitor_chanakya.py`
- Scheduler: `/backend/services/publishing_scheduler.py`
- Admin endpoint: `/backend/routers/admin.py`
- Content calendar: `/backend/services/chanakya_content_calendar.py`

## Support Contacts

- Kling API: https://kling.kuaishou.com/
- ElevenLabs: https://elevenlabs.io/
- Fal.ai: https://fal.ai/
- Railway: https://railway.app/

## Version

v1.0.0 - Production-ready monitoring system
Last updated: 2026-03-18
