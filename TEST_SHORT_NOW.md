# Test Short Generation Now (Without OAuth)

## What Will Happen

Since Railway OAuth isn't working yet, let's test the Short generation LOCALLY first.

**The video WILL:**
- ✅ Generate Hinglish script (Chanakya wisdom)
- ✅ Generate voice (ElevenLabs)
- ✅ Generate 5 Kling clips ($3.50)
- ✅ Stitch everything with captions
- ✅ Save to MongoDB

**The video WON'T:**
- ❌ Auto-post to YouTube (no OAuth token yet)
- ❌ Auto-post to Instagram (no OAuth token yet)

**BUT** - You'll get the MP4 file saved, and you can review the quality!

---

## Run This Command:

```bash
cd ~/Desktop/FVS-audit/backend
python3 test_chanakya_automation.py
```

Choose **"1"** for Short

**Cost:** $3.58 (Kling $3.50 + ElevenLabs $0.08)
**Time:** ~15 minutes
**Result:** 50-second Hinglish Chanakya Short video

---

## What You'll See:

```
🎬 CHANAKYA SUTRA 3X/WEEK AUTOMATION - MANUAL TEST
Choose what to test:
  1 → Test Short production (50 sec, 5 clips)
  2 → Test Long-form production (6 min, 3 clips + 33 images)

Enter 1 or 2: 1

Testing SHORT production:
  • Generate 1 Short idea (Chanakya wisdom, Hinglish)
  • Produce: Script → Voice → 5 Kling clips (10 sec each) → Captions
  • ⏱️  Expected time: ~15 minutes
  • 💰 Expected cost: ~$3.50 (5 clips × $0.70)

✅ FAL_KEY: Set
✅ GEMINI_API_KEY: Set
✅ ELEVENLABS_API_KEY: Set
✅ MONGO_URL: Set

🚀 Starting automation test...

[Chanakya Manual Test] Generating Short...
[Chanakya Manual Test] Producing short: 'Chanakya's 3 Laws of Power'
[Chanakya Manual Test] ✅ Short completed: Chanakya's 3 Laws of Power
[Chanakya Manual Test] 🚀 Starting auto-posting to platforms...
[Chanakya Manual Test] ❌ YouTube upload error: No YouTube token found for user chanakya-sutra
[Chanakya Manual Test] ❌ Instagram upload error: Instagram not connected
[Chanakya Manual Test] ⏭️  TikTok skipped (no credentials configured)
[Chanakya Manual Test] 🎉 Auto-posting complete!

✅ AUTOMATION TEST COMPLETE!
```

---

## After Video Generation:

The video will be in MongoDB. To download it:

1. Open MongoDB Compass
2. Database: `forgevoice_prod`
3. Collection: `submissions_collection`
4. Find the newest entry (clientId: "chanakya-sutra")
5. Copy the `sourceFileUrl`
6. Open URL in browser → Download MP4

**OR** - Check local temp files in `/tmp/fvs_video/` or backend logs for file paths.

---

## Then Set Up OAuth (We'll Fix This Together)

After you see the video quality is good, we'll:
1. Fix the OAuth endpoint issue
2. Connect your YouTube channel
3. Re-run the test → video auto-posts!

---

**Ready to generate the first Short?**

Run: `cd ~/Desktop/FVS-audit/backend && python3 test_chanakya_automation.py`

Let me know when you start it and I'll monitor with you!
