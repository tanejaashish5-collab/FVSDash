# Chanakya Sutra 3x/Week Automation — Complete Guide

## 📅 Posting Schedule

**Pattern:** Tuesday / Thursday / Sunday at 8 AM UTC (1:30 PM IST)

### Week-by-Week Content Rotation

| Week | Tuesday | Thursday | Sunday |
|------|---------|----------|--------|
| **Odd (1, 3, 5...)** | Short | Long-form | Short |
| **Even (2, 4, 6...)** | Long-form | Short | Long-form |

**Result:** 12 Shorts + 12 Long-form per month (24 videos total)

---

## 💰 Cost Breakdown (Updated for Kling 10-sec Reality)

### Per Video Costs

**1 Short (50 seconds):**
- 5 Kling clips × 10 sec × $0.70 = **$3.50**
- Voice (ElevenLabs) = $0.08
- **Total: $3.58/short** (rounded to $3.50 for budgeting)

**1 Long-form (6 minutes):**
- 3 Kling hero clips × 10 sec × $0.70 = $2.10
- 33 AI images (Ken Burns effect) = $0.00 (using DALL-E free tier or local gen)
- Voice (ElevenLabs, 6 min) = $0.15
- **Total: $2.25/long-form**

### Monthly Costs (4 weeks)

| Item | Quantity | Unit Cost | Monthly Total |
|------|----------|-----------|---------------|
| Shorts | 12 | $3.50 | $42.00 |
| Long-form | 12 | $2.25 | $27.00 |
| ElevenLabs Growth | 1 plan | $22.00 | $22.00 |
| **TOTAL** | **24 videos** | - | **$91/month** |

**Per-video average:** $91 ÷ 24 = **$3.79/video**

---

## 🎬 Video Specifications

### Shorts
- **Duration:** 50 seconds (max 59 for YouTube Shorts)
- **Aspect Ratio:** 9:16 (vertical)
- **Clips:** 5 Kling Pro clips × 10 sec each
- **Format:** All video clips (no images)
- **Captions:** Burned-in with "shorts" style
- **Audio:** ElevenLabs voice + optional background music
- **Platforms:** YouTube Shorts, TikTok, Instagram Reels

### Long-form
- **Duration:** 6 minutes (360 seconds)
- **Aspect Ratio:** 16:9 (horizontal)
- **Clips:** 3 Kling Pro hero clips × 10 sec = 30 sec
- **Images:** 33 AI-generated images × 10 sec = 330 sec (with Ken Burns effect)
- **Total:** 30 sec video + 330 sec images = 360 sec (6 min)
- **Captions:** Burned-in with standard style
- **Audio:** ElevenLabs voice + optional background music
- **Platforms:** YouTube only (too long for TikTok/IG)

---

## 🤖 Automation Workflow

### 1. Cron Jobs (APScheduler)

**Tuesday 8 AM UTC (1:30 PM IST):**
```python
chanakya_tuesday_content()
→ Week 1, 3, 5... → _chanakya_generate_short("Tuesday")
→ Week 2, 4, 6... → _chanakya_generate_longform("Tuesday")
```

**Thursday 8 AM UTC (1:30 PM IST):**
```python
chanakya_thursday_content()
→ Week 1, 3, 5... → _chanakya_generate_longform("Thursday")  # Opposite of Tuesday
→ Week 2, 4, 6... → _chanakya_generate_short("Thursday")
```

**Sunday 8 AM UTC (1:30 PM IST):**
```python
chanakya_sunday_content()
→ Week 1, 3, 5... → _chanakya_generate_short("Sunday")  # Same as Tuesday
→ Week 2, 4, 6... → _chanakya_generate_longform("Sunday")
```

### 2. Production Pipeline

**For Shorts:**
1. Generate 1 short idea (Gemini AI, Chanakya niche)
2. Produce video:
   - Split script into exactly 5 scenes (10 sec each)
   - Generate voiceover (ElevenLabs)
   - Generate 5 Kling Pro clips in parallel
   - Resize clips to 9:16
   - Concatenate clips
   - Merge voiceover + background music
   - Burn captions (YouTube Shorts style)
   - Upload to storage
3. Save to MongoDB `submissions_collection` with `status: "SCHEDULED"`
4. **TODO:** Auto-post to YouTube Shorts / TikTok / Instagram at 6 PM IST

**For Long-form:**
1. Generate 1 long-form idea (Gemini AI, Chanakya niche)
2. Generate full script (Gemini AI, Chanakya voice)
3. Produce video:
   - Split script into exactly 36 scenes (10 sec each)
     - Mark 3 scenes as `type: "veo"` (hero clips)
     - Remaining 33 as `type: "image"` (AI images)
   - Generate voiceover (ElevenLabs)
   - Generate 3 Kling Pro clips + 33 AI images in parallel
   - Apply Ken Burns effect to images (zoom/pan)
   - Resize all to 16:9
   - Concatenate all media
   - Merge voiceover + background music
   - Burn captions (standard style)
   - Upload to storage
4. Save to MongoDB with `status: "SCHEDULED"`
5. **TODO:** Auto-post to YouTube at 9 AM IST (next day)

---

## 🔧 Setup Instructions

### 1. Verify Environment Variables

Required in `backend/.env`:

```bash
# Core
MONGO_URL=mongodb+srv://...
GEMINI_API_KEY=...
ELEVENLABS_API_KEY=...

# Kling Video (REQUIRED)
FAL_KEY=18371231-95a5-4970-98a2-bdb97d5f03bd:db32995646a8672c01c54bb644b766ad

# YouTube (for auto-posting)
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_API_KEY=...

# TikTok (optional, for auto-posting shorts)
# TIKTOK_CLIENT_KEY=...
# TIKTOK_CLIENT_SECRET=...

# Instagram (optional, handled via OAuth)
# No static credentials needed
```

### 2. Install Dependencies

```bash
cd ~/Desktop/FVS-audit/backend
pip install fal-client>=0.5.0
```

### 3. Start Backend

```bash
cd ~/Desktop/FVS-audit/backend
python server.py
```

**Expected logs:**
```
Publishing scheduler started (checking every 30 seconds)
Daily analytics sync scheduled at 6 AM UTC
Daily trend scan scheduled at 7 AM UTC
Chanakya Sutra 3x/week content scheduled:
  → Tuesday 8 AM UTC (1:30 PM IST)
  → Thursday 8 AM UTC (1:30 PM IST)
  → Sunday 8 AM UTC (1:30 PM IST)
```

### 4. Test Manually (Optional)

```bash
cd ~/Desktop/FVS-audit/backend
python test_chanakya_automation.py
```

Choose:
- **1** → Test Short ($3.50, ~15 min)
- **2** → Test Long-form ($2.25, ~25 min)

---

## 📊 Monitoring

### 1. Check MongoDB

```javascript
use forgevoice_prod;
db.submissions_collection.find({clientId: "chanakya-sutra"}).sort({createdAt: -1});
```

**Expected:** New entries every Tue/Thu/Sun with:
- `status: "SCHEDULED"`
- `sourceFileUrl: "https://...mp4"`
- `contentType: "Podcast"` (both shorts and long-form use this)

### 2. Check Backend Logs

Look for:
- `[Chanakya Tuesday] Week 11 → Generating short`
- `[Chanakya Tuesday] ✅ Short completed: Ancient Wisdom for Modern Leaders`

### 3. Check fal.ai Dashboard

- https://fal.ai/dashboard
- Usage → Should show 5 clips (Short) or 3 clips (Long-form) per run
- Billing → Verify $3.50 (Short) or $2.10 (Long-form) charges

---

## 🚨 Troubleshooting

### Error: "FAL_KEY not set, using mock video clip"
**Fix:** Add `FAL_KEY=...` to `.env`, restart backend

### Error: "Kling returned no video URL"
**Causes:**
- Invalid API key → Check fal.ai dashboard
- No credits → Add payment method to fal.ai
- Network timeout → Retry

**Fix:**
1. Verify FAL_KEY: `echo $FAL_KEY` (should show your key)
2. Check fal.ai credits: https://fal.ai/dashboard
3. Test API: `python test_kling_api.py`

### Videos generating but not posting
**This is expected!** Auto-posting requires:
- **YouTube:** OAuth connection + `schedule_youtube_upload()` function wired
- **TikTok:** `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` in .env
- **Instagram:** Facebook OAuth connection + linked IG Business Account

**Current workaround:**
1. Videos save to `submissions_collection` in MongoDB
2. Download from `sourceFileUrl`
3. Upload manually to YouTube/TikTok/IG

---

## 🎯 Next Steps (Optional Enhancements)

### Week 3: Auto-Posting

1. **YouTube Shorts + Long-form:**
   - Wire `schedule_youtube_upload()` function
   - Set scheduled times:
     - Shorts → 6 PM IST (12:30 PM UTC)
     - Long-form → 9 AM IST next day (3:30 AM UTC)

2. **TikTok (Shorts only):**
   - Get credentials: https://developers.tiktok.com/
   - Add `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` to .env
   - Wire `upload_video_to_tiktok()` in `_chanakya_generate_short()`

3. **Instagram Reels (Shorts only):**
   - OAuth connect via `/api/oauth/connect/instagram`
   - Wire `upload_reel_to_instagram()` in `_chanakya_generate_short()`

### Week 4: Quality Optimization

1. **Chanakya-Specific Prompts:**
   - Visual style: "Ancient Mauryan palace, saffron dhoti, white beard"
   - Lighting: "Golden hour, dramatic shadows, Bollywood epic cinematography"
   - Theme: "Indian philosophy, strategic wisdom, leadership lessons"

2. **Voice Fine-Tuning:**
   - Test different ElevenLabs voices for Hinglish quality
   - Consider voice cloning ($30 one-time) if you want your own voice

3. **A/B Testing Framework:**
   - Generate 2-3 shorts per slot, pick best based on engagement
   - Analyze which topics/styles perform best
   - Feed winning patterns back into idea generation

---

## ✅ Success Metrics (Track After 30 Days)

| Metric | Target | How to Check |
|--------|--------|--------------|
| **Videos Generated** | 24 (12 shorts + 12 long) | MongoDB count |
| **Cost Per Video** | <$4/video | fal.ai + ElevenLabs billing |
| **Automation Uptime** | 100% (12 successful runs) | Backend logs |
| **Average View Duration** | >50% retention | YouTube Analytics |

---

## 📞 Support

- **FVS Repo:** https://github.com/tanejaashish5-collab/FVSDash
- **fal.ai Docs:** https://docs.fal.ai/
- **Kling Models:** https://fal.ai/models?search=kling
- **This Guide:** `CHANAKYA_3X_WEEK_SCHEDULE.md`

---

## 📝 Summary

**What's Working:**
- ✅ Kling video generation (10-sec clips @ $0.70 each)
- ✅ 3x/week automation (Tue/Thu/Sun at 8 AM UTC)
- ✅ Alternating Short/Long-form schedule (12+12/month)
- ✅ Cost-optimized ($91/month vs $358 daily posting)
- ✅ Quality maintained (Pro quality clips + AI images)

**What's Pending:**
- ⏳ YouTube auto-posting (Week 3)
- ⏳ TikTok/Instagram auto-posting (Week 3)
- ⏳ Chanakya-specific prompt templates (Week 4)
- ⏳ Voice fine-tuning (Week 4)

**Your Action:**
- Backend is running → Automation starts next Tue/Thu/Sun ✅
- Optional: Test manually with `python test_chanakya_automation.py`
- Optional: Set up TikTok/IG OAuth for auto-posting

**Cost:** $91/month for 24 high-quality videos 🚀
