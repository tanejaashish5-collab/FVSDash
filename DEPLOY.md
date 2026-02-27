# ForgeVoice Studio — Deployment Guide
*From zero to live app in ~30 minutes*

---

## What You're Deploying

| Component | Platform | Cost |
|-----------|----------|------|
| Backend (FastAPI + Python) | Railway.app | ~$5-10/mo |
| Frontend (React) | Vercel | Free |
| Database (MongoDB) | MongoDB Atlas | Free (512MB) |
| AI / LLM | Google Gemini API | Free tier (2M tokens/day) |
| Voice generation | ElevenLabs | Free (10k chars/mo) or $5/mo |
| Video generation | Google Veo 2 | ~$0.35/sec generated |

---

## Step 1 — MongoDB Atlas (5 min)

1. Go to: **https://cloud.mongodb.com**
2. Sign up (free) → Create a new project "ForgeVoice"
3. **Build a Database** → Choose **M0 FREE** tier → Select any region → Create
4. **Security → Database Access** → Add New Database User
   - Username: `fvsadmin`
   - Password: generate a strong one, **save it**
   - Role: "Read and write to any database"
5. **Security → Network Access** → Add IP Address → **Allow Access from Anywhere** (0.0.0.0/0)
6. **Deployment → Database** → Click **Connect** → **Drivers** → Copy the connection string
   - It looks like: `mongodb+srv://fvsadmin:PASSWORD@cluster0.xxxxx.mongodb.net/`
   - Replace `<password>` with your actual password
7. **Save this connection string** — you'll need it in Step 3

---

## Step 2 — Google Cloud APIs (10 min)

> You already have a GCP account. Just need to enable the right APIs.

1. Go to: **https://console.cloud.google.com**
2. Select your existing project (or create one: "ForgeVoice")

### Enable YouTube APIs:
3. Search "YouTube Data API v3" → Enable
4. Search "YouTube Analytics API" → Enable

### Enable AI APIs:
5. Search "Vertex AI API" → Enable (for Google Veo 2)
6. Search "Generative Language API" → Enable (for Gemini)

### Create OAuth 2.0 Credentials (for YouTube login):
7. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: "ForgeVoice Studio"
   - Authorised redirect URIs: `https://YOUR-RAILWAY-URL/api/oauth/callback/youtube`
     (You'll update this after Step 3 — leave as placeholder for now)
   - Click **Create** → **Copy Client ID and Client Secret** → save them

### Create API Key (for YouTube Data queries):
8. **Credentials → Create Credentials → API Key**
   - Copy the key
   - Restrict it to: YouTube Data API v3

### Get Gemini API Key:
9. **APIs & Services → Credentials → Create Credentials → API Key**
   - Copy this key (different from YouTube API key)
   - Restrict it to: Generative Language API

**Save:** Client ID, Client Secret, YouTube API Key, Gemini API Key

---

## Step 3 — Railway (Backend, 5 min)

1. Go to: **https://railway.app**
2. **Sign Up with GitHub** → Authorise Railway
3. **New Project → Deploy from GitHub repo**
   - Select: `tanejaashish5-collab/FVS-Dash-Claude`
   - Branch: `claude/explain-codebase-mlvqr3dywl5p3pyi-6KOZI`
   - Railway auto-detects `nixpacks.toml` and starts building
4. Wait for build (~3-5 min) — you'll see logs
5. **Settings → Networking → Generate Domain** → Copy your Railway URL
   - It looks like: `https://fvs-dash-claude-production.railway.app`
6. **Go back to Google Cloud** (Step 2, item 7) → Update the OAuth redirect URI with your Railway URL:
   `https://YOUR-RAILWAY-URL/api/oauth/callback/youtube`
7. **Back in Railway → Variables** → Add ALL these env vars:

```
MONGO_URL                = [your Atlas connection string from Step 1]
DB_NAME                  = forgevoice_prod
JWT_SECRET               = [any random 64-char string — use: openssl rand -hex 32]
APP_ENV                  = production
CORS_ORIGINS             = https://your-vercel-url.vercel.app  (update after Step 4)
GEMINI_API_KEY           = [from Step 2]
YOUTUBE_CLIENT_ID        = [from Step 2]
YOUTUBE_CLIENT_SECRET    = [from Step 2]
YOUTUBE_API_KEY          = [from Step 2]
YOUTUBE_REDIRECT_URI     = https://YOUR-RAILWAY-URL/api/oauth/callback/youtube
BACKEND_PUBLIC_URL       = https://YOUR-RAILWAY-URL
ELEVENLABS_API_KEY       = [from Step 5 below]
VEO_API_KEY              = [from Step 6 below — can add later]
VIDEO_TEMP_DIR           = /tmp/fvs_video
```

8. Railway will auto-redeploy when you save variables

---

## Step 4 — Vercel (Frontend, 3 min)

1. Go to: **https://vercel.com**
2. **Sign Up with GitHub** → Authorise Vercel
3. **Add New Project → Import Git Repository**
   - Select: `tanejaashish5-collab/FVS-Dash-Claude`
   - **Root Directory**: `frontend`
   - Framework: **Create React App**
4. **Environment Variables** → Add:
   ```
   REACT_APP_BACKEND_URL = https://YOUR-RAILWAY-URL
   ```
5. **Deploy** → Wait ~2 min → Copy your Vercel URL
6. Go back to Railway → Update `CORS_ORIGINS` with your Vercel URL

**Your app is now live at the Vercel URL!**

---

## Step 5 — ElevenLabs Voice (2 min)

1. Go to: **https://elevenlabs.io**
2. **Sign Up** → Free tier gives you 10,000 chars/month
3. Click your **Profile icon → API Keys → Generate**
4. Copy the key → Add to Railway as `ELEVENLABS_API_KEY`

---

## Step 6 — Google Veo 2 (Video Generation, 5 min)

1. Go to: **https://console.cloud.google.com → Vertex AI**
2. **Enable the Vertex AI API** (if not done in Step 2)
3. **IAM & Admin → Service Accounts → Create Service Account**
   - Name: "forgevoice-veo"
   - Role: "Vertex AI User"
   - Click Done
4. **Click the service account → Keys → Add Key → Create JSON key**
5. A JSON file downloads — this is your service account key
6. In Railway Variables, add: `VEO_API_KEY` = the contents of the JSON file (as a single line)
   - OR: use a simple API key if Vertex AI supports it for Veo in your region

> **Cost note:** Veo 2 charges ~$0.35 per second of video generated.
> A YouTube Short uses ~8-10 clips × 8 seconds = ~64-80 seconds = ~$22-28 in Veo costs per Short.
> Without VEO_API_KEY set, the app uses mock videos (free) so you can test everything else first.

---

## Step 7 — First Login

1. Open your Vercel URL in browser
2. Click **Login**
3. **Admin credentials** (change these immediately!):
   - Email: `admin@forgevoice.com`
   - Password: `admin123`
4. **Client credentials:**
   - Email: `client@forgevoice.com`
   - Password: `client123`
5. Go to **Settings → Change Password** right away

---

## Step 8 — Connect YouTube Channel

1. Login as a client user
2. Go to **Settings → Platform Connections**
3. Click **Connect YouTube**
4. Authorise with your Google account
5. Your YouTube channel is now connected — analytics will sync within 24 hours

---

## Verification Checklist

- [ ] Backend health: `https://YOUR-RAILWAY-URL/api/health` → `{"status": "ok"}`
- [ ] Login works at Vercel URL
- [ ] Dashboard shows 5 demo submissions (seeded automatically)
- [ ] Strategy Lab → "Generate Research" produces content (needs GEMINI_API_KEY)
- [ ] Calendar → "Generate Schedule" works (needs GEMINI_API_KEY)
- [ ] AI Video Lab → mode selector shows "Generate Voice" option
- [ ] Settings → YouTube connect button visible (OAuth flow needs YOUTUBE_CLIENT_ID)
- [ ] Analytics page loads (shows demo data or 0 until YouTube synced)

---

## Architecture Summary

```
User Browser
    │
    ▼
Vercel (React Frontend)
    │  REACT_APP_BACKEND_URL
    ▼
Railway (FastAPI Backend)
    ├── MongoDB Atlas (database)
    ├── Google Gemini (AI/LLM)
    ├── Google Veo 2 (video clips)
    ├── ElevenLabs (voice)
    ├── YouTube API (auth + analytics + publish)
    └── Local /uploads (video files, or S3 if configured)
```

---

## Troubleshooting

**Backend won't start:**
- Check Railway logs → usually a missing env var or MongoDB connection issue
- Verify `MONGO_URL` has the password replaced (not `<password>`)

**YouTube OAuth error:**
- Verify `YOUTUBE_REDIRECT_URI` exactly matches what's in Google Cloud Console
- Make sure the OAuth consent screen is configured in Google Cloud

**Video generation shows mock:**
- This is normal until `VEO_API_KEY` is set
- Mock videos are dark placeholder clips for testing

**CORS error in browser:**
- Update `CORS_ORIGINS` in Railway to match your exact Vercel URL (no trailing slash)

---

## Monthly Cost Estimate (Internal Use)

| Service | Cost |
|---------|------|
| Railway (backend) | $5-10/mo |
| MongoDB Atlas M0 | Free |
| Vercel (frontend) | Free |
| Gemini API | Free tier (2M tokens/day) |
| ElevenLabs | Free (10k chars) or $5/mo |
| Veo 2 | Pay per use (~$22 per Short in clips) |
| **Total fixed** | **~$5-15/mo** |
