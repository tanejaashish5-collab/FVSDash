# Quick Setup Guide — Get Chanakya Automation Running

## Prerequisites Checklist

Before we can test the Short generation and auto-posting, verify these are configured:

### ✅ Step 1: Verify Environment Variables

Check your `backend/.env` file has these set (not placeholder values):

```bash
# REQUIRED - Already verified ✅
FAL_KEY=18371231-95a5-4970-98a2-bdb97d5f03bd:db32995646a8672c01c54bb644b766ad  ✅
ELEVENLABS_API_KEY=your-actual-key  ⏳ (you have 91 credits remaining)
GEMINI_API_KEY=your-actual-key  ⏳

# REQUIRED - Need to verify
MONGO_URL=mongodb+srv://ACTUAL_USERNAME:ACTUAL_PASSWORD@cluster.mongodb.net/...  ⏳

# FOR AUTO-POSTING - Need OAuth setup
YOUTUBE_CLIENT_ID=your-oauth-client-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-your-client-secret
YOUTUBE_API_KEY=AIza-your-api-key

# OPTIONAL - TikTok auto-posting
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

---

## Step 2: Set Up Chanakya Channel Profile

**Option A: Via MongoDB Compass (Easiest)**

1. Open MongoDB Compass
2. Connect to your database
3. Navigate to database: `forgevoice_prod`
4. Find collection: `channel_profiles_collection`
5. Click "Insert Document"
6. Paste this JSON:

```json
{
  "id": "chanakya-profile-001",
  "clientId": "chanakya-sutra",
  "languageStyle": "hinglish",
  "thumbnailStyle": "black_minimal",
  "brandDescription": "Channel delivering ancient Chanakya Niti wisdom for modern business leaders, entrepreneurs, and strategists. Content blends Indian philosophy with practical business strategy, told through cinematic storytelling in Hinglish.",
  "tone": "Authoritative storyteller, dramatic and wise, strategic thinker, speaks with gravitas and conviction",
  "contentPillars": [
    "Chanakya Niti Principles",
    "Leadership & Strategy",
    "Business Warfare Tactics",
    "Ancient Indian Philosophy",
    "Entrepreneurship Wisdom",
    "Power Dynamics",
    "Negotiation Mastery",
    "Decision-Making Frameworks"
  ],
  "thumbnailPromptTemplate": "Pure black background, bold white text, single gold accent line, no faces, extremely high contrast, dramatic lighting",
  "visualPromptTemplate": "Chanakya — bald head, sharp defined jawline, long white beard, saffron-orange robe, intense piercing eyes, calm but commanding expression, ancient Indian strategist aesthetic, age ~55, lean build, photorealistic, cinematic lighting, golden hour",
  "scriptsPerIdea": 1,
  "thumbnailsPerShort": 1,
  "voiceId": "",
  "createdAt": "2026-03-13T14:30:00.000Z",
  "updatedAt": "2026-03-13T14:30:00.000Z"
}
```

7. Click "Insert"
8. ✅ Profile configured!

**Option B: Via mongosh (Command Line)**

```bash
mongosh "your-actual-mongodb-connection-string"
```

Then paste and run:
```javascript
use forgevoice_prod;

db.channel_profiles_collection.insertOne({
  id: "chanakya-profile-001",
  clientId: "chanakya-sutra",
  languageStyle: "hinglish",
  thumbnailStyle: "black_minimal",
  brandDescription: "Channel delivering ancient Chanakya Niti wisdom for modern business leaders...",
  tone: "Authoritative storyteller, dramatic and wise...",
  contentPillars: [
    "Chanakya Niti Principles",
    "Leadership & Strategy",
    "Business Warfare Tactics",
    "Ancient Indian Philosophy",
    "Entrepreneurship Wisdom",
    "Power Dynamics",
    "Negotiation Mastery",
    "Decision-Making Frameworks"
  ],
  thumbnailPromptTemplate: "Pure black background, bold white text...",
  visualPromptTemplate: "Chanakya — bald head, sharp defined jawline, long white beard, saffron-orange robe...",
  scriptsPerIdea: 1,
  thumbnailsPerShort: 1,
  voiceId: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
```

---

## Step 3: Set Up OAuth for Auto-Posting

### YouTube (REQUIRED for auto-posting)

**Current Status:** YouTube upload service exists but needs OAuth connection.

**Steps:**

1. **Get YouTube API Credentials:**
   - Go to: https://console.cloud.google.com/
   - Create project (or select existing)
   - Enable APIs: "YouTube Data API v3" + "YouTube Analytics API"
   - Create OAuth 2.0 Client ID (Type: Web application)
   - Add redirect URI: `http://localhost:8000/api/oauth/callback/youtube`
   - Copy `CLIENT_ID` and `CLIENT_SECRET`

2. **Update .env:**
   ```bash
   YOUTUBE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   YOUTUBE_CLIENT_SECRET=GOCSPX-your-secret
   YOUTUBE_API_KEY=AIza-your-api-key
   YOUTUBE_REDIRECT_URI=http://localhost:8000/api/oauth/callback/youtube
   BACKEND_PUBLIC_URL=http://localhost:8000
   ```

3. **Connect Account:**
   - Start backend: `cd backend && python server.py`
   - Open: http://localhost:8000/api/oauth/connect/youtube?clientId=chanakya-sutra
   - Authorize your YouTube channel
   - ✅ OAuth token saved to MongoDB

### TikTok (OPTIONAL for auto-posting shorts)

**Steps:**

1. **Get TikTok API Credentials:**
   - Go to: https://developers.tiktok.com/
   - Create app
   - Enable "Content Posting API"
   - Get `CLIENT_KEY` and `CLIENT_SECRET`

2. **Update .env:**
   ```bash
   TIKTOK_CLIENT_KEY=your-client-key
   TIKTOK_CLIENT_SECRET=your-client-secret
   ```

3. **Connect Account:**
   - Start backend
   - Open: http://localhost:8000/api/oauth/connect/tiktok?clientId=chanakya-sutra
   - Authorize
   - ✅ Token saved

### Instagram (OPTIONAL for auto-posting reels)

**Steps:**

1. **Get Facebook App Credentials:**
   - Go to: https://developers.facebook.com/
   - Create app
   - Add Instagram Basic Display + Instagram Content Publishing
   - Link Instagram Business Account to Facebook Page

2. **Connect Account:**
   - Start backend
   - Open: http://localhost:8000/api/oauth/connect/instagram?clientId=chanakya-sutra
   - Authorize
   - ✅ Token saved

---

## Step 4: Wire Auto-Posting to Short Generation

I need to update the code to actually call the upload functions. Here's what needs to be done:

**File:** `backend/services/publishing_scheduler.py`

**Current code** (line 351-354):
```python
# TODO: Wire to YouTube Shorts API scheduler + TikTok/Instagram posting
# await schedule_youtube_upload(submission_id=short_result["submission"]["id"], ...)
# await upload_video_to_tiktok(CLIENT_ID, job_id, video_path, short_idea["topic"])
# await upload_reel_to_instagram(CLIENT_ID, job_id, video_url, short_idea["topic"])
```

**Needs to become:**
```python
# Auto-post to all platforms
from services.youtube_upload_service import upload_video_to_youtube
from services.tiktok_upload_service import upload_video_to_tiktok
from services.instagram_upload_service import upload_reel_to_instagram

# Get video file path and URL
video_url = short_result["submission"]["sourceFileUrl"]
# TODO: Download video to local path for TikTok upload

# YouTube Shorts
await upload_video_to_youtube(
    user_id=CLIENT_ID,
    video_file_path=local_video_path,
    title=short_idea["topic"],
    description=f"Chanakya wisdom for modern leaders\n\n{short_idea['topic']}\n\n#Chanakya #Leadership #Business",
    category_id="22",  # People & Blogs
    privacy_status="public",
    is_short=True
)

# TikTok (if credentials configured)
if os.getenv("TIKTOK_CLIENT_KEY"):
    await upload_video_to_tiktok(
        client_id=CLIENT_ID,
        job_id=str(uuid.uuid4()),
        video_file_path=local_video_path,
        title=short_idea["topic"],
        privacy_level="PUBLIC_TO_EVERYONE"
    )

# Instagram Reels (if connected)
await upload_reel_to_instagram(
    client_id=CLIENT_ID,
    job_id=str(uuid.uuid4()),
    video_url=video_url,
    caption=f"{short_idea['topic']}\n\n#Chanakya #Leadership #Strategy"
)
```

---

## Step 5: Test Everything

### Option A: Full Test (Costs $3.58)

```bash
cd ~/Desktop/FVS-audit/backend
python test_chanakya_automation.py
```

Choose "1" for Short:
- ⏱️  Time: ~15 minutes
- 💰 Cost: $3.50 (Kling) + $0.08 (ElevenLabs) = $3.58
- 📹 Output: 50-second Hinglish Short about Chanakya wisdom
- 🚀 Auto-posted to: YouTube + TikTok + Instagram (if OAuth connected)

### Option B: Dry Run (FREE, no API calls)

I can add a `--dry-run` flag to test without generating video.

---

## What I Need From You Right Now

**To proceed with testing, please provide:**

1. ✅ **Confirm you want to spend $3.58** on test Short generation + voice
   - This will generate 1 real Short (50 sec, Hinglish, Chanakya theme)
   - Uses 5 Kling clips + ElevenLabs voice
   - Saves to MongoDB

2. ⏳ **Set up Channel Profile** (2 minutes)
   - Use MongoDB Compass or mongosh (instructions above)
   - Or tell me your MongoDB connection string and I'll create a script

3. ⏳ **YouTube OAuth** (5 minutes)
   - Do you have YouTube API credentials already?
   - Or do you want me to guide you through getting them?

4. ⏳ **TikTok/Instagram** (optional, can skip for now)
   - Want to set these up or just test YouTube first?

5. ⏳ **Wire Auto-Posting Code** (I'll do this, 5 minutes)
   - Once OAuth is connected, I'll update the code to actually post

---

## Recommended Order

**Phase 1: Generate + Save (No auto-posting yet)**
1. Set up channel profile ✅
2. Generate 1 test Short ($3.58)
3. Verify it saves to MongoDB
4. Manually check the video quality

**Phase 2: Enable Auto-Posting**
1. Set up YouTube OAuth
2. Wire upload function
3. Re-run test → video posts to YouTube automatically
4. Verify it appears on your channel

**Phase 3: Add TikTok/Instagram** (optional)
1. Set up OAuth for each platform
2. Wire upload functions
3. Test → video posts everywhere

---

**Which phase do you want to start with?** And can you set up the channel profile via MongoDB while I prepare the auto-posting code?
