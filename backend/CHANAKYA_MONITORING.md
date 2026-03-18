# Chanakya Video Production - Monitoring & Trigger System

Comprehensive monitoring and control system for Chanakya Sutra automated video production.

## Overview

The `monitor_chanakya.py` script provides complete control over Chanakya video production:

- **Trigger production**: Start short or long-form video generation on-demand
- **Real-time monitoring**: Track production progress with database polling
- **Automatic retries**: Retry failed productions with configurable attempts
- **YouTube verification**: Check upload status and get video URLs
- **Status reporting**: Detailed logs of all productions
- **Works anywhere**: Local development or Railway production

## Quick Start

### Trigger Short Video Production

```bash
python monitor_chanakya.py trigger --format short
```

This will:
1. Generate Chanakya wisdom idea (Hinglish, 50-60 seconds)
2. Produce script with AI
3. Generate voiceover with ElevenLabs
4. Create 5 Kling video clips (10 sec each)
5. Add captions and edit
6. Upload to YouTube/TikTok/Instagram
7. Monitor progress until complete

**Cost**: ~$3.50 (5 clips × $0.70)
**Time**: ~15 minutes

### Trigger Long-Form Video Production

```bash
python monitor_chanakya.py trigger --format longform
```

This will:
1. Generate Chanakya long-form topic (Hinglish, 6 minutes)
2. Produce detailed script
3. Generate voiceover
4. Create 3 Kling hero clips + 33 AI images
5. Add captions and edit
6. Upload to YouTube
7. Monitor progress until complete

**Cost**: ~$2.25 (3 clips × $0.70 + images)
**Time**: ~25 minutes

### Check Production Status

```bash
# Last 24 hours
python monitor_chanakya.py status

# Last 7 days
python monitor_chanakya.py status --hours 168
```

Shows:
- Total submissions
- Status breakdown (COMPLETED, SCHEDULED, FAILED, etc.)
- Completed videos with YouTube URLs
- Failed productions with error messages

## Advanced Usage

### Trigger Without Waiting

```bash
python monitor_chanakya.py trigger --format short --no-wait
```

Starts production and returns immediately. Use `status` command to check later.

### Retry Failed Submission

```bash
python monitor_chanakya.py retry --submission-id abc123
```

Retries a specific failed production using the same idea.

### Auto-Retry All Failures

```bash
# Retry all failures from last 24 hours
python monitor_chanakya.py auto-retry

# Retry failures from last 48 hours, max 5 attempts each
python monitor_chanakya.py auto-retry --hours 48 --max-retries 5
```

Automatically retries all failed productions with:
- Configurable lookback period
- Max retry attempts per submission
- 60-second delay between retries
- Detailed logging

### Verify YouTube Upload

```bash
python monitor_chanakya.py verify --submission-id abc123
```

Checks if video was successfully uploaded to YouTube and returns:
- YouTube video ID
- YouTube URL
- Upload status

## Database Integration

The script monitors these MongoDB collections:

### submissions_collection
- Tracks video submissions
- Fields: `id`, `title`, `status`, `sourceFileUrl`, `youtubeVideoId`, `createdAt`
- Status values: `DRAFT`, `SCHEDULED`, `PROCESSING`, `COMPLETED`, `FAILED`

### video_tasks_collection
- Tracks individual video generation tasks
- Fields: `taskType`, `status`, `provider`, `providerJobId`
- Providers: `kling`, `fal`, `elevenlabs`

### fvs_ideas_collection
- Tracks generated content ideas
- Fields: `topic`, `format`, `status`, `submissionId`

## Production Flow

### Short Video (50-60 seconds)

1. **Idea Generation** (5 sec)
   - Uses Chanakya content calendar
   - Selects topic based on pillar rotation
   - Creates FVS idea record

2. **Script Generation** (10 sec)
   - Gemini AI generates Hinglish script
   - Optimized for 50-60 second duration
   - Includes hook, wisdom, modern application

3. **Voiceover** (30 sec)
   - ElevenLabs text-to-speech
   - Authoritative male voice
   - Hinglish pronunciation

4. **Video Clips** (10-12 min)
   - 5 × Kling video clips (10 sec each)
   - Prompt: Chanakya character + setting
   - Parallel generation when possible

5. **Editing** (2-3 min)
   - Combine clips with voiceover
   - Add captions (auto-generated)
   - Final MP4 export

6. **Upload** (1-2 min)
   - YouTube Shorts (primary)
   - TikTok (if configured)
   - Instagram Reels

### Long-Form Video (6 minutes)

1. **Idea Generation** (5 sec)
   - Long-form topic selection
   - More detailed outline

2. **Script Generation** (20 sec)
   - 6-minute detailed script
   - Multiple sections with transitions

3. **Voiceover** (45 sec)
   - Longer audio generation

4. **Video Assets** (15-18 min)
   - 3 × Kling hero clips (15 sec each)
   - 33 × AI images (Flux Pro)
   - Strategic placement for engagement

5. **Editing** (4-5 min)
   - Complex timeline with clips + images
   - Captions + B-roll
   - Final export

6. **Upload** (2-3 min)
   - YouTube (long-form category)
   - Description with script excerpt

## Real-Time Monitoring

When using `trigger` without `--no-wait`, the script polls MongoDB every 15 seconds:

```
[2026-03-18 14:30:00] TRIGGERING CHANAKYA SHORT PRODUCTION
[2026-03-18 14:30:05] Production task created successfully
[2026-03-18 14:30:05] Monitoring production progress...
[2026-03-18 14:30:20] [PROGRESS] 1 idea(s) generated
[2026-03-18 14:30:35] [PROGRESS] Submission created: Chanakya on Office Politics
[2026-03-18 14:30:35]             ID: sub_abc123
[2026-03-18 14:30:35]             Status: PROCESSING
[2026-03-18 14:31:50] [PROGRESS] Video task: PROCESSING
[2026-03-18 14:31:50]             Type: video_generation
[2026-03-18 14:31:50]             Provider: kling
[2026-03-18 14:42:30] PRODUCTION COMPLETE!
[2026-03-18 14:42:30] Time elapsed: 730 seconds (12.2 minutes)
[2026-03-18 14:42:30] Submission ID: sub_abc123
[2026-03-18 14:42:30] Title: Chanakya on Office Politics
[2026-03-18 14:42:30] Video URL: https://storage.googleapis.com/...
[2026-03-18 14:42:30] YouTube ID: dQw4w9WgXcQ
[2026-03-18 14:42:30] YouTube URL: https://youtube.com/watch?v=dQw4w9WgXcQ
```

## Error Handling & Retries

### Automatic Retry Logic

The script includes retry mechanisms for common failures:

**Transient API Failures**
- Kling API timeouts → Retry up to 3 times
- ElevenLabs rate limits → Exponential backoff
- YouTube quota exceeded → Log and skip

**Permanent Failures**
- Invalid API keys → Stop and alert
- Insufficient credits → Stop and alert
- MongoDB connection lost → Retry connection

### Manual Intervention

For failures requiring manual fixes:

1. Check error message in MongoDB:
   ```bash
   python monitor_chanakya.py status --hours 24
   ```

2. Fix the underlying issue (API keys, credits, etc.)

3. Retry the failed submission:
   ```bash
   python monitor_chanakya.py retry --submission-id <id>
   ```

## Running on Railway

The script works in Railway's production environment:

### One-Time Trigger

```bash
# SSH into Railway container
railway run bash

# Trigger production
python monitor_chanakya.py trigger --format short --no-wait

# Check Railway logs to monitor
railway logs --tail
```

### Automated Retries

Add to Railway cron or run manually:

```bash
# Retry all failures from last 24 hours
python monitor_chanakya.py auto-retry
```

### Environment Variables

Required in Railway environment:
- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: Database name (forgevoice_prod)
- `FAL_KEY`: Fal.ai API key
- `GEMINI_API_KEY`: Google Gemini key
- `ELEVENLABS_API_KEY`: ElevenLabs key
- `YOUTUBE_CLIENT_ID`: YouTube OAuth (for upload)
- `YOUTUBE_CLIENT_SECRET`: YouTube OAuth secret

## Cost Tracking

### Per Video Costs

**Short (50-60 seconds)**
- 5 Kling clips × $0.70 = $3.50
- ElevenLabs voice (60s) = $0.03
- Gemini script = ~$0.01
- **Total**: ~$3.54/video

**Long-Form (6 minutes)**
- 3 Kling clips × $0.70 = $2.10
- 33 AI images × $0.005 = $0.17
- ElevenLabs voice (360s) = $0.18
- Gemini script = ~$0.02
- **Total**: ~$2.47/video

### Monthly Costs (7x/week)

- Shorts (4×/week) = 16/month × $3.54 = $56.64
- Long-form (3×/week) = 12/month × $2.47 = $29.64
- **Total**: ~$86.28/month

### API Usage Dashboard

Check costs at:
- Kling: https://kling.kuaishou.com/
- ElevenLabs: https://elevenlabs.io/usage
- Gemini: https://ai.google.dev/pricing
- Fal.ai: https://fal.ai/dashboard

## Troubleshooting

### Production Times Out

**Symptom**: Script waits 30 minutes then reports timeout

**Causes**:
- Kling API slow during peak hours
- Network connectivity issues
- MongoDB polling failure

**Solutions**:
1. Check Kling API status
2. Increase timeout: Edit `PRODUCTION_TIMEOUT` in script
3. Use `--no-wait` and check later with `status`

### No Submissions Created

**Symptom**: Monitoring shows 0 submissions after 5 minutes

**Causes**:
- Idea generation failed
- MongoDB connection issue
- FVS service error

**Solutions**:
1. Check Railway logs for errors
2. Verify MongoDB connection
3. Test idea generation separately

### YouTube Upload Failed

**Symptom**: Video created but not uploaded

**Causes**:
- YouTube OAuth expired
- Daily upload quota exceeded (100 videos/day)
- Video file too large

**Solutions**:
1. Re-authenticate YouTube OAuth
2. Wait for quota reset (midnight PST)
3. Check video file size (<128GB limit)

### High API Costs

**Symptom**: Unexpected API charges

**Causes**:
- Production running multiple times accidentally
- Failed videos consuming retry quota
- Testing in production

**Solutions**:
1. Review production logs for duplicates
2. Use `status` to check submission count
3. Test in development environment first

## Development & Testing

### Local Testing

```bash
# Ensure .env has test credentials
cd /Users/ashishtaneja/Desktop/FVS/backend

# Test short production
python monitor_chanakya.py trigger --format short

# Monitor without triggering
python monitor_chanakya.py status
```

### Mock Mode (Coming Soon)

For cost-free testing:

```bash
MOCK_API_CALLS=true python monitor_chanakya.py trigger --format short
```

Will simulate API calls without actual generation.

## API Reference

### ChanakyaMonitor Class

```python
from monitor_chanakya import ChanakyaMonitor

monitor = ChanakyaMonitor()

# Trigger production
result = await monitor.trigger_production(
    format="short",  # or "longform"
    wait=True        # Monitor progress
)

# Check status
status = await monitor.check_status(hours=24)

# Retry failed
result = await monitor.retry_failed(submission_id="abc123")

# Auto-retry all failures
result = await monitor.auto_retry_failures(
    hours=24,
    max_retries=3
)

# Verify YouTube
result = await monitor.verify_youtube_upload(submission_id="abc123")
```

## Integration with Existing System

The monitor works seamlessly with:

- **Admin Dashboard**: Trigger via `/admin/chanakya/trigger` endpoint
- **APScheduler**: Scheduled 7×/week automation
- **Publishing Pipeline**: Auto-posting to platforms
- **Analytics**: Track video performance post-upload

## Production Checklist

Before using in production:

- [ ] All API keys configured in Railway
- [ ] MongoDB connection tested
- [ ] YouTube OAuth authenticated
- [ ] Sufficient API credits (Kling, ElevenLabs)
- [ ] Alert system configured (optional)
- [ ] Cost tracking dashboard setup

## Support

For issues or questions:

1. Check Railway logs: `railway logs --tail`
2. Review MongoDB collections for errors
3. Test with `status` command first
4. Use `retry` for manual recovery
5. Contact Ashish for API quota issues

## Changelog

### v1.0.0 (2026-03-18)
- Initial release
- Trigger, monitor, retry, status commands
- Real-time progress tracking
- Automatic failure retries
- YouTube verification
- Production-ready error handling
