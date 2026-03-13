# Chanakya Sutra Channel — Full Automation Setup Guide

## Overview
This guide sets up **100% autonomous content generation** for your Chanakya Sutra YouTube channel:
- **1 Short (75-90 sec)** auto-generated daily at 8 AM UTC (1:30 PM IST)
- **1 Long-form (10-12 min)** auto-generated daily at 8 AM UTC (1:30 PM IST)
- Auto-scheduled posting: Shorts at 6 PM IST, Long-form at 9 AM next day
- **Total cost:** $165/mo for 60 videos ($2.76/video)

---

## Step 1: Get Your fal.ai API Key (2 minutes)

### Sign Up for fal.ai
1. Go to https://fal.ai
2. Click **"Sign Up"** (or "Log In" if you have an account)
3. Create account with email/Google/GitHub

### Get API Key
1. After login, go to https://fal.ai/dashboard/keys
2. Click **"Add Key"**
3. Name it: `chanakya-sutra`
4. Click **"Create Key"**
5. **COPY THE KEY** (shown once only!) — looks like: `fal_xxxxxxxx...`

### Free Credits
- fal.ai gives free credits to new users for testing
- Enough to generate 10-20 test videos
- After that, it's pay-per-use (no subscription)

---

## Step 2: Update Your .env File

1. **Navigate to your FVS backend directory:**
   ```bash
   cd ~/Desktop/FVS-audit/backend
   ```

2. **Create or edit your `.env` file:**
   ```bash
   # If .env doesn't exist, copy the template
   cp ../.env.template .env

   # Edit the file
   nano .env  # or use your preferred editor
   ```

3. **Add your fal.ai key:**
   ```bash
   # Find this line:
   FAL_KEY=your-fal-api-key-here

   # Replace with your actual key:
   FAL_KEY=fal_xxxxxxxxxxxxxxxxxxxxxxxx
   ```

4. **Save and exit** (Ctrl+X, then Y, then Enter if using nano)

---

## Step 3: Install New Dependencies

```bash
cd ~/Desktop/FVS-audit/backend

# Install fal-client package
pip install fal-client>=0.5.0

# Or install all requirements
pip install -r requirements.txt
```

---

## Step 4: Verify Existing Configuration

Make sure these are already in your `.env`:

```bash
# Gemini (for script generation)
GEMINI_API_KEY=your-existing-gemini-key

# ElevenLabs (for voice generation)
ELEVENLABS_API_KEY=your-existing-elevenlabs-key

# YouTube OAuth (for auto-posting)
YOUTUBE_CLIENT_ID=your-existing-youtube-client-id
YOUTUBE_CLIENT_SECRET=your-existing-youtube-client-secret
YOUTUBE_API_KEY=your-existing-youtube-api-key
```

---

## Step 5: Test Video Generation (Manual Test)

Before enabling automation, test that video generation works:

```bash
# Start your FVS backend
cd ~/Desktop/FVS-audit/backend
python server.py

# In another terminal, test the API
curl -X POST http://localhost:8000/api/fvs/produce-episode \
  -H "Content-Type: application/json" \
  -d '{
    "ideaId": "test-chanakya-001",
    "mode": "full_auto_short"
  }'
```

**Expected output:**
- Log shows: `Using Kling 2.6 Pro ($0.07/sec) for 8sec clip`
- Video generates successfully
- No "FAL_KEY not set" warnings

---

## Step 6: Configure Channel Profile

Your Chanakya Sutra channel needs these settings in MongoDB `client_settings` collection:

```json
{
  "clientId": "chanakya-sutra",
  "channelName": "Chanakya Sutra",
  "niche": "chanakya_niti",
  "languageStyle": "hinglish",
  "contentPillars": [
    "Wealth Building",
    "Enemy Strategy",
    "Mind Control",
    "Success Formula"
  ],
  "tone": "Authoritative yet accessible, ancient wisdom for modern life",
  "automationLevel": "full_auto_longform",
  "autoPostingEnabled": true,

  "videoSettings": {
    "shorts": {
      "duration": "75-90 sec",
      "heroClipsPerVideo": 8,
      "aspectRatio": "9:16"
    },
    "longform": {
      "duration": "10-12 min",
      "heroClipsPerVideo": 6,
      "imageClipsPerVideo": 24,
      "aspectRatio": "16:9"
    }
  },

  "voiceSettings": {
    "provider": "elevenlabs",
    "voiceId": "pNInz6obpgDQGcFmaJgB",
    "stability": 0.50,
    "similarityBoost": 0.85
  },

  "postingSchedule": {
    "shorts": "daily 18:00 IST",
    "longform": "daily 09:00 IST"
  }
}
```

---

## Cost Breakdown (After Setup)

### Per Day:
- **1 Short:** $1.15 (75 sec of Kling Pro + voice)
- **1 Long-form:** $3.63 (6 Kling Pro hero clips + 24 images + voice)
- **Daily total:** $4.78

### Per Month (30 days):
| Item | Cost |
|------|------|
| Shorts production (30) | $34.50 |
| Long-form production (30) | $108.90 |
| ElevenLabs Growth plan | $22.00 |
| **TOTAL** | **$165.40/mo** |

**Output:** 60 videos/month (30 shorts + 30 long-form)
**Per-video cost:** $2.76

---

## Quality Settings

### Kling Model Selection (Auto-Optimized)
- **Shorts:** All clips use Kling 2.6 Pro ($0.07/sec) — highest quality
- **Long-form hero clips:** Kling 2.6 Pro ($0.07/sec) — dramatic moments
- **Long-form b-roll:** Kling 2.1 Standard ($0.025/sec) — saves 64% cost
- **Long-form images:** AI generated images + Ken Burns effect ($0.005 each)

### ElevenLabs Voice (Hinglish Optimized)
- **Model:** Turbo v2.5 (best Hinglish support)
- **Voice:** "Adam" (authoritative male, storyteller tone)
- **Settings:** Stability 0.50, Similarity 0.85, Style 0.40

---

## Automation Schedule (After Week 2 Implementation)

**Daily at 8 AM UTC (1:30 PM IST):**
1. Generate 1 Chanakya Sutra short idea (Gemini AI)
2. Generate script in Hinglish (60-90 sec)
3. Generate voice (ElevenLabs)
4. Generate 8 video clips (Kling 2.6 Pro)
5. Stitch clips + captions + music
6. Schedule YouTube Shorts upload for 6 PM IST

**Same time:**
7. Generate 1 Chanakya Sutra long-form idea (Gemini AI)
8. Generate script in Hinglish (10-12 min)
9. Generate voice (ElevenLabs, 12 min)
10. Generate 6 hero clips (Kling Pro) + 24 images (Ken Burns)
11. Stitch scenes + captions + music
12. Schedule YouTube upload for 9 AM IST next day

**Total automation time:** ~45 min for both videos

---

## Troubleshooting

### Error: "FAL_KEY not set"
- Check `.env` file has `FAL_KEY=fal_xxxxx`
- Restart backend: `python server.py`

### Error: "fal-client not installed"
- Run: `pip install fal-client>=0.5.0`

### Error: "Kling returned no video URL"
- Check fal.ai dashboard: https://fal.ai/dashboard
- Verify API key is active
- Check if free credits exhausted (add payment method)

### Video quality too low
- Prompts might need optimization (Week 3 task)
- Check logs for which Kling model was used (should be "2.6 Pro" for shorts)

### Voice sounds wrong
- Update `voiceId` in channel profile
- Try these alternatives:
  - `pNInz6obpgDQGcFmaJgB` = Adam (authoritative)
  - `EXAVITQu4vr4xnSDxMaL` = Clyde (storyteller)
  - Custom cloned voice (one-time $30 setup)

---

## What's Next (Week 2)

After verifying video generation works:
1. Daily automation cron will be added (`chanakya_daily_content()`)
2. Scheduler will trigger at 8 AM UTC daily
3. Videos will auto-post to YouTube (OAuth already configured)
4. You receive email notifications when videos are live

**You won't need to manually trigger anything after Week 2 is complete.**

---

## Support

- **FVS Codebase:** https://github.com/tanejaashish5-collab/FVSDash
- **fal.ai Dashboard:** https://fal.ai/dashboard
- **fal.ai Docs:** https://docs.fal.ai/
- **Kling Models:** https://fal.ai/models?search=kling

---

## Summary Checklist

- [ ] Sign up for fal.ai → Get API key
- [ ] Add `FAL_KEY` to `.env` file
- [ ] Run `pip install fal-client>=0.5.0`
- [ ] Test manual video generation (curl command above)
- [ ] Verify channel profile in MongoDB
- [ ] Ready for Week 2 (daily automation cron)

**Once all checkboxes are ✅, you're ready for full automation!**
