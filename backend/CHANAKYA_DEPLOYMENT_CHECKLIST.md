# Chanakya Monitor - Railway Deployment Checklist

Complete checklist for deploying the Chanakya monitoring system to Railway production.

## Pre-Deployment Verification

### 1. Environment Variables

Verify all required environment variables are set in Railway:

```bash
railway variables
```

Required variables:
- [ ] `MONGO_URL` - MongoDB Atlas connection string
- [ ] `DB_NAME` - Database name (forgevoice_prod)
- [ ] `FAL_KEY` - Fal.ai API key for video generation
- [ ] `GEMINI_API_KEY` - Google Gemini for script generation
- [ ] `ELEVENLABS_API_KEY` - ElevenLabs for voiceover
- [ ] `YOUTUBE_CLIENT_ID` - YouTube OAuth client ID
- [ ] `YOUTUBE_CLIENT_SECRET` - YouTube OAuth client secret
- [ ] `AWS_S3_BUCKET` - S3 bucket for video storage (optional)
- [ ] `AWS_ACCESS_KEY_ID` - AWS access key (optional)
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS secret (optional)

Test MongoDB connection:
```bash
railway run bash
python3 -c "from db.mongo import get_db; print(get_db().name)"
```

### 2. API Credits & Quotas

Check all API provider accounts have sufficient credits:

- [ ] **Kling API** (https://kling.kuaishou.com/)
  - Current credits: $_______
  - Minimum needed: $100 for ~30 videos
  - Refill if below: $50

- [ ] **ElevenLabs** (https://elevenlabs.io/usage)
  - Current characters: _______
  - Minimum needed: 50,000 chars for month
  - Plan: _______ (Creator/Pro/Business)

- [ ] **Google Gemini** (https://ai.google.dev/)
  - API key active: Yes/No
  - Rate limit: _______ requests/min
  - Cost: Free tier or paid?

- [ ] **Fal.ai** (https://fal.ai/dashboard)
  - Current credits: $_______
  - Used for: AI images in long-form
  - Minimum needed: $20

### 3. YouTube OAuth Setup

Verify YouTube OAuth is configured and authenticated:

```bash
# Check OAuth tokens in MongoDB
db.oauth_tokens.findOne({
  clientId: "chanakya-sutra",
  platform: "youtube",
  connected: true
})
```

- [ ] OAuth token exists
- [ ] Access token not expired
- [ ] Refresh token present
- [ ] Test upload quota: _______ videos/day remaining

Re-authenticate if needed:
```bash
# Visit admin dashboard
https://fvsdash-production.up.railway.app/admin
# Click "Connect YouTube" for chanakya-sutra client
```

### 4. File Deployments

Verify all new files are committed and pushed:

```bash
git status
git add backend/monitor_chanakya.py
git add backend/CHANAKYA_MONITORING.md
git add backend/CHANAKYA_QUICKSTART.md
git add backend/CHANAKYA_DEPLOYMENT_CHECKLIST.md
git add backend/test_monitor_integration.py
git commit -m "feat: add comprehensive Chanakya monitoring system"
git push origin main
```

- [ ] `monitor_chanakya.py` - Main monitoring script
- [ ] `CHANAKYA_MONITORING.md` - Full documentation
- [ ] `CHANAKYA_QUICKSTART.md` - Quick reference
- [ ] `test_monitor_integration.py` - Integration tests

### 5. Railway Deployment

Deploy to Railway:

```bash
# Automatic deploy on push (if configured)
# OR manual deploy
railway up
```

- [ ] Deployment started
- [ ] Build successful
- [ ] No errors in logs
- [ ] Health check passed

Monitor deployment:
```bash
railway logs --tail
```

## Post-Deployment Testing

### 1. Integration Test

Run the integration test in Railway:

```bash
railway run bash
cd backend
python3 test_monitor_integration.py
```

Expected output:
```
✓ Monitor class imported successfully
✓ Monitor initialized (environment verified)
✓ Status check complete
✓ Extended status check complete
✓ Failure check complete
✓ Database connections verified
ALL TESTS PASSED ✓
```

- [ ] All tests passed
- [ ] Database connections work
- [ ] No import errors
- [ ] Environment variables loaded

### 2. Status Check

Check current production status:

```bash
railway run bash
cd backend
python3 monitor_chanakya.py status --hours 168
```

- [ ] Command runs without errors
- [ ] Shows existing submissions (if any)
- [ ] Status breakdown displayed
- [ ] No database connection errors

### 3. Dry Run (Optional)

Test triggering WITHOUT waiting:

```bash
railway run bash
cd backend
python3 monitor_chanakya.py trigger --format short --no-wait
```

**WAIT!** This will actually trigger production and cost ~$3.50.

Only run if you want to test the full pipeline.

- [ ] Production triggered successfully
- [ ] Idea generated
- [ ] Submission created
- [ ] Video tasks started
- [ ] Monitoring working

Monitor progress:
```bash
railway logs --tail | grep Chanakya
```

### 4. Admin Endpoint Test

Test the admin API endpoint:

```bash
# Get admin token first
ADMIN_TOKEN="<your-admin-jwt-token>"

# Trigger short video
curl -X POST \
  "https://fvsdash-production.up.railway.app/admin/chanakya/trigger?format=short" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Expected response:
```json
{
  "status": "triggered",
  "format": "short",
  "message": "Chanakya Short generation started..."
}
```

- [ ] Endpoint responds
- [ ] Authentication works
- [ ] Production triggered
- [ ] Check Railway logs for confirmation

## Scheduler Verification

Verify APScheduler has Chanakya jobs registered:

```bash
railway logs --tail | grep "Scheduler"
```

Look for these lines:
```
✓ Added Chanakya Saturday Short
✓ Added Chanakya Monday Short
✓ Added Chanakya Wednesday Short
✓ Added Chanakya Friday Short
✓ Added Chanakya Sunday Long-form
✓ Added Chanakya Tuesday Long-form
✓ Added Chanakya Thursday Long-form
```

- [ ] All 7 jobs registered (4 shorts + 3 long-form)
- [ ] Next run times displayed
- [ ] Times correct: 2:30 PM UTC (8 PM IST)
- [ ] No job registration errors

Check next scheduled run:
```python
# In Railway container
python3 -c "
from services.publishing_scheduler import get_scheduler
scheduler = get_scheduler()
if scheduler:
    for job in scheduler.get_jobs():
        if 'chanakya' in job.id.lower():
            print(f'{job.id}: {job.next_run_time}')
"
```

## Monitoring Setup

### 1. Railway Dashboard

Add to Railway dashboard:

- [ ] Set up alerts for:
  - Deployment failures
  - High memory usage (>80%)
  - Crash detection
  - Error rate spikes

### 2. MongoDB Monitoring

Add indexes for performance:

```javascript
// In MongoDB Atlas
db.submissions.createIndex({ clientId: 1, createdAt: -1 })
db.submissions.createIndex({ clientId: 1, status: 1 })
db.video_tasks.createIndex({ clientId: 1, createdAt: -1 })
db.fvs_ideas.createIndex({ clientId: 1, status: 1 })
```

- [ ] Indexes created
- [ ] Query performance acceptable
- [ ] No slow query warnings

### 3. Cost Tracking

Set up cost tracking spreadsheet:

| Date | Shorts | Long-forms | Kling Cost | ElevenLabs | Total |
|------|--------|------------|------------|------------|-------|
| Example | 4 | 3 | $16.80 | $0.60 | $17.40 |

- [ ] Spreadsheet created
- [ ] API cost tracking enabled
- [ ] Weekly review scheduled
- [ ] Budget alerts set ($100/month)

### 4. Logging & Alerts

Configure logging levels in Railway:

```bash
# In Railway environment
LOG_LEVEL=INFO
CHANAKYA_ALERT_EMAIL=ashish@example.com  # Optional
```

- [ ] Log level set
- [ ] Logs visible in Railway dashboard
- [ ] Alert email configured (optional)
- [ ] Slack webhook configured (optional)

## Production Readiness Checklist

### Pre-Launch

- [ ] All environment variables set
- [ ] API credits sufficient ($100+ each)
- [ ] YouTube OAuth authenticated
- [ ] Database indexes created
- [ ] Integration tests passed
- [ ] Scheduler verified
- [ ] Admin endpoint tested
- [ ] Cost tracking setup

### Launch Day (First Automated Run)

Schedule: Next scheduled day (Sat/Sun/Mon/Tue/Wed/Thu/Fri at 8 PM IST)

**Before scheduled time**:
- [ ] Check API credits (2 hours before)
- [ ] Verify Railway is running
- [ ] Clear any old failed tasks
- [ ] Monitor Railway logs starting 15 min before

**During scheduled run**:
- [ ] Watch Railway logs in real-time
- [ ] Monitor MongoDB for new submissions
- [ ] Check Kling API dashboard for tasks
- [ ] Verify video generation progress

**After scheduled run**:
- [ ] Verify submission created
- [ ] Check video quality
- [ ] Confirm YouTube upload
- [ ] Review production time
- [ ] Check API costs
- [ ] Update cost tracking

### First Week Monitoring

Day 1-7: Monitor every scheduled run

- [ ] Day 1 (Short/Long) - Manual verification
- [ ] Day 2 (Short/Long) - Check logs only
- [ ] Day 3 (Short/Long) - Check logs only
- [ ] Day 4 (Short/Long) - Verify YouTube
- [ ] Day 5 (Short/Long) - Check costs
- [ ] Day 6 (Short/Long) - Full audit
- [ ] Day 7 (Short/Long) - Week review

Weekly review checklist:
- [ ] All 7 videos produced successfully
- [ ] Total cost within budget
- [ ] YouTube uploads working
- [ ] No quota issues
- [ ] Quality acceptable
- [ ] Audience engagement metrics

## Rollback Plan

If production fails or has issues:

### Immediate Actions

1. **Pause scheduler** (if many failures):
   ```bash
   # Comment out Chanakya jobs in publishing_scheduler.py
   git commit -am "chore: pause Chanakya automation"
   git push
   ```

2. **Stop ongoing production**:
   ```bash
   railway restart
   ```

3. **Check what went wrong**:
   ```bash
   python3 monitor_chanakya.py status --hours 24
   railway logs --tail | grep -i error
   ```

### Common Issues & Fixes

**Issue**: Kling API failing
- [ ] Check credits
- [ ] Check API status
- [ ] Retry manually: `python3 monitor_chanakya.py retry --submission-id <id>`

**Issue**: YouTube upload failing
- [ ] Re-authenticate OAuth
- [ ] Check daily quota (100 videos/day)
- [ ] Verify video file size

**Issue**: High costs
- [ ] Check for duplicate runs
- [ ] Review failed videos consuming retries
- [ ] Reduce schedule temporarily

**Issue**: MongoDB connection lost
- [ ] Check Railway environment variables
- [ ] Verify MongoDB Atlas is up
- [ ] Restart Railway service

### Restore Normal Operation

1. Fix the root cause
2. Test manually first:
   ```bash
   python3 monitor_chanakya.py trigger --format short
   ```
3. If successful, uncomment scheduler jobs
4. Push and deploy
5. Monitor next scheduled run closely

## Success Criteria

Production is considered successful when:

- [ ] **Reliability**: 95%+ success rate over 1 month
- [ ] **Cost**: <$100/month average
- [ ] **Quality**: Videos meet brand standards
- [ ] **Timing**: All scheduled runs complete on time
- [ ] **Uploads**: 100% YouTube upload success
- [ ] **Performance**: <30 min total production time
- [ ] **Monitoring**: All alerts working
- [ ] **Recovery**: Auto-retry fixes 80%+ failures

## Ongoing Maintenance

### Daily (Automated)
- Scheduled productions run at 8 PM IST
- Auto-retry failures if configured

### Weekly (5 minutes)
- [ ] Monday: Review last week's status
  ```bash
  python3 monitor_chanakya.py status --hours 168
  ```
- [ ] Wednesday: Check API costs
- [ ] Friday: Verify YouTube uploads

### Monthly (30 minutes)
- [ ] Review all productions
- [ ] Audit costs vs. budget
- [ ] Check video performance metrics
- [ ] Refill API credits if needed
- [ ] Review and optimize prompts
- [ ] Update content calendar if needed

## Emergency Contacts

- **Railway Support**: https://railway.app/help
- **MongoDB Atlas**: https://cloud.mongodb.com/support
- **Kling API**: https://kling.kuaishou.com/support
- **ElevenLabs**: support@elevenlabs.io
- **Google Gemini**: https://ai.google.dev/support

## Documentation

- Full docs: `/backend/CHANAKYA_MONITORING.md`
- Quick reference: `/backend/CHANAKYA_QUICKSTART.md`
- This checklist: `/backend/CHANAKYA_DEPLOYMENT_CHECKLIST.md`

## Deployment Sign-Off

Deployment completed by: _________________
Date: _________________
Version: v1.0.0

Initial test results:
- Integration test: PASS / FAIL
- Status check: PASS / FAIL
- Admin endpoint: PASS / FAIL
- First production run: PASS / FAIL / PENDING

Notes:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

Ready for production: YES / NO

Approved by: _________________
Date: _________________
