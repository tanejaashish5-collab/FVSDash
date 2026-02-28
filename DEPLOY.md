# ForgeVoice Studio — Deployment Guide (SOP)
*From zero to live app. Read every word — the details matter.*

> **Before you start:** If you've deployed this before and hit issues, check `INCIDENT_LOG.md` first.
> It contains exact root-cause analyses of every problem we've encountered.

---

## Platform Map — What Lives Where

```
User's Browser
    │
    ▼
Vercel (React Frontend — the website the user sees)
    │  sends API requests to REACT_APP_BACKEND_URL
    ▼
Railway (FastAPI Backend — the server that handles logic)
    ├── MongoDB Atlas    (database — stores users, submissions, etc.)
    ├── Google Gemini    (AI writing assistant)
    ├── Google Veo 2     (AI video generation)
    ├── ElevenLabs       (voice synthesis)
    └── YouTube API      (OAuth login + analytics + publishing)
```

**Why two platforms?**
- Vercel is optimised for serving static websites (HTML/CSS/JS) — it's free and fast
- Railway runs Python servers (FastAPI backend) — Vercel can't do this

**The most important concept to understand:**
> Vercel and Railway are two DIFFERENT domains. When the frontend (on Vercel) calls the backend (on Railway), the browser treats this as a "cross-origin" request and applies CORS security rules. If CORS is misconfigured, ALL API calls silently fail — including login. See INCIDENT-001 in INCIDENT_LOG.md.

---

## Cost Summary

| Service | Cost |
|---------|------|
| Railway (backend) | ~$5-10/mo |
| MongoDB Atlas M0 | Free |
| Vercel (frontend) | Free |
| Gemini API | Free tier (2M tokens/day) |
| ElevenLabs | Free (10k chars) or $5/mo |
| Veo 2 | Pay per use (~$22 per Short) |
| **Total fixed** | **~$5-15/mo** |

---

## Step 1 — MongoDB Atlas (5 min)

MongoDB Atlas is the database. It stores all users, submissions, calendar events, etc.

1. Go to **https://cloud.mongodb.com** → Sign up free
2. **Create a new project** → name it "ForgeVoice"
3. **Build a Database** → Choose **M0 FREE** tier → pick any region → Create
4. **Security → Database Access** → Add New Database User
   - Username: `fvsadmin`
   - Password: click "Autogenerate" → **copy and save this password**
   - Role: "Read and write to any database"
5. **Security → Network Access** → Add IP Address → **Allow Access from Anywhere** (`0.0.0.0/0`)
   - *This lets Railway connect from any IP — required because Railway's IPs change*
6. **Deployment → Database** → Click **Connect** → **Drivers** → Copy the connection string
   - It looks like: `mongodb+srv://fvsadmin:<password>@cluster0.xxxxx.mongodb.net/`
   - **Replace `<password>` with the actual password you saved in step 4**
   - The final string should have NO angle brackets in it

**Save:** the full MongoDB connection string (with real password substituted in)

---

## Step 2 — Google Cloud APIs (10 min)

This covers YouTube integration and AI features.

1. Go to **https://console.cloud.google.com**
2. Select or create a project named "ForgeVoice"

### Enable APIs:
3. **Search "YouTube Data API v3"** → Enable
4. **Search "YouTube Analytics API"** → Enable
5. **Search "Vertex AI API"** → Enable (for Veo 2 video generation)
6. **Search "Generative Language API"** → Enable (for Gemini AI)

### Create OAuth 2.0 Credentials (YouTube login):
7. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: "ForgeVoice Studio"
   - Authorised redirect URIs: add a placeholder for now — `https://placeholder.railway.app/api/oauth/callback/youtube`
     *(You'll update this with the real Railway URL in Step 3)*
   - Click **Create** → copy the **Client ID** and **Client Secret**

### Create API Key (YouTube Data queries):
8. **Credentials → Create Credentials → API Key** → copy the key
   - Restrict it to: YouTube Data API v3

### Get Gemini API Key:
9. **Credentials → Create Credentials → API Key** → copy this key (separate from YouTube key)
   - Restrict it to: Generative Language API

**Save:** Client ID, Client Secret, YouTube API Key, Gemini API Key

---

## Step 3 — Railway (Backend Deployment)

Railway runs the Python backend server.

### 3a. Initial Setup
1. Go to **https://railway.app** → Sign Up with GitHub
2. **New Project → Deploy from GitHub repo**
   - Select: `tanejaashish5-collab/FVS-Dash-Claude`
   - Branch: `main`
3. Wait for the build (~3-5 min) — watch the logs panel
4. **Settings → Networking → Generate Domain** → copy your Railway URL
   - It looks like: `https://fvsdash-production.up.railway.app`

### 3b. Enable Auto-Deploy (do this NOW to avoid manual redeploys)
5. **Railway → Service → Settings → Source**
   - Confirm "Deploy on Push" is toggled **ON**
   - Branch should be set to `main`
   - If this is not ON, Railway will NOT auto-deploy when you push code — you'll have to manually redeploy every time

### 3c. Set Environment Variables

Go to **Railway → Variables** and add ALL of these:

```
MONGO_URL             = [your Atlas connection string from Step 1 — with real password]
DB_NAME               = forgevoice_prod
JWT_SECRET            = [generate with: openssl rand -hex 32 — or any random 64-char string]
APP_ENV               = production
GEMINI_API_KEY        = [from Step 2]
YOUTUBE_CLIENT_ID     = [from Step 2]
YOUTUBE_CLIENT_SECRET = [from Step 2]
YOUTUBE_API_KEY       = [from Step 2]
YOUTUBE_REDIRECT_URI  = https://YOUR-RAILWAY-URL/api/oauth/callback/youtube
BACKEND_PUBLIC_URL    = https://YOUR-RAILWAY-URL
ELEVENLABS_API_KEY    = [from Step 5 — can add later]
VEO_API_KEY           = [from Step 6 — can add later]
VIDEO_TEMP_DIR        = /tmp/fvs_video
```

> **DO NOT add `CORS_ORIGINS` yet.**
> Wait until after Step 4 when you have your Vercel URL.
> If you add it with the wrong value, login will break (see INCIDENT-001).

### 3d. Update Google Cloud OAuth Redirect URI
6. Go back to Google Cloud → APIs & Services → Credentials → your OAuth 2.0 Client ID
7. Replace the placeholder redirect URI with: `https://YOUR-RAILWAY-URL/api/oauth/callback/youtube`

### 3e. Verify Backend is Running
8. Open in browser: `https://YOUR-RAILWAY-URL/api/health`
9. You should see: `{"status": "ok", "service": "ForgeVoice Studio API", "db": "ok"}`
   - If `db` shows an error → check your `MONGO_URL` value in Railway variables
   - If page doesn't load → check Railway build/deploy logs for errors

---

## Step 4 — Vercel (Frontend Deployment)

Vercel serves the React frontend (the website).

1. Go to **https://vercel.com** → Sign Up with GitHub
2. **Add New Project → Import Git Repository**
   - Select: `tanejaashish5-collab/FVS-Dash-Claude`
   - **Root Directory: `frontend`** ← IMPORTANT — must be set to `frontend`, not the root
   - Framework: **Create React App**
3. **Environment Variables** → Add:
   ```
   REACT_APP_BACKEND_URL = https://YOUR-RAILWAY-URL
   ```
   - This is the Railway URL from Step 3 — no trailing slash
4. Click **Deploy** → wait ~2-3 min → copy your Vercel URL
   - It looks like: `https://fvsdash.vercel.app`

---

## Step 5 — Connect CORS (CRITICAL — Login Won't Work Without This)

> **What is CORS and why does this step matter?**
>
> Your frontend lives at `https://fvsdash.vercel.app` (Vercel).
> Your backend lives at `https://fvsdash-production.up.railway.app` (Railway).
> These are two different domains. When the browser (on the Vercel page) calls the Railway API,
> the browser does a security check first — it sends a "preflight" OPTIONS request to Railway asking:
> "Is `https://fvsdash.vercel.app` allowed to call you?"
>
> If `CORS_ORIGINS` is not set, the backend says "yes, everyone is allowed" → login works.
> If `CORS_ORIGINS` is set to the WRONG URL, the backend says "no, blocked" → 400 error → login fails silently.

### Set CORS_ORIGINS in Railway

1. Go to Railway → Variables
2. Add:
   ```
   CORS_ORIGINS = https://YOUR-VERCEL-URL.vercel.app
   ```
   - Use your **exact** Vercel URL — no trailing slash
   - This is the URL where **the frontend website is served from**, not the backend URL
3. Railway will auto-redeploy

### Verify CORS is Working (do this before testing login)

Open your browser, go to your Vercel URL, open DevTools (F12) → Network tab.
Try to log in. Watch the Network tab:
- You should see an `OPTIONS` request to `/api/auth/login` that returns **200** (not 400)
- Then a `POST` request to `/api/auth/login` that returns **200**

If OPTIONS returns 400 → CORS is misconfigured. Check `CORS_ORIGINS` value in Railway exactly matches the Vercel URL.

---

## Step 6 — First Login & Verification

1. Open your Vercel URL in browser
2. Click **Login**
3. **Admin credentials:**
   - Email: `admin@forgevoice.com`
   - Password: `admin123`
4. **Change this password immediately** after login via Settings

### Full Verification Checklist

Work through this top to bottom — don't skip steps:

- [ ] `https://YOUR-RAILWAY-URL/api/health` → `{"status": "ok", "db": "ok"}`
- [ ] Login works at Vercel URL (no error, redirects to dashboard)
- [ ] Dashboard shows 5 demo submissions (seeded automatically on first run)
- [ ] Strategy Lab → "Generate Research" produces content (needs GEMINI_API_KEY)
- [ ] Calendar → "Generate Schedule" works (needs GEMINI_API_KEY)
- [ ] AI Video Lab → mode selector shows options (mock videos until VEO_API_KEY set)
- [ ] Settings → YouTube connect button visible (OAuth flow needs YOUTUBE_CLIENT_ID)
- [ ] Analytics page loads without crashing

---

## Step 7 — ElevenLabs Voice (2 min)

1. Go to **https://elevenlabs.io** → Sign Up (free tier = 10,000 chars/month)
2. **Profile icon → API Keys → Generate** → copy the key
3. In Railway Variables → add: `ELEVENLABS_API_KEY = [your key]`

---

## Step 8 — Google Veo 2 Video Generation (5 min)

> Without this, the app uses placeholder mock videos — everything else still works.

1. Go to **https://console.cloud.google.com → Vertex AI** → Ensure Vertex AI API is enabled
2. **IAM & Admin → Service Accounts → Create Service Account**
   - Name: "forgevoice-veo" | Role: "Vertex AI User"
3. **Click the service account → Keys → Add Key → Create JSON key** → a JSON file downloads
4. In Railway Variables → add: `VEO_API_KEY` = full contents of the JSON file (single line)

> **Cost note:** Veo 2 charges ~$0.35/sec of video. A YouTube Short = ~$22-28 in video clips alone.

---

## Troubleshooting — Exact Diagnostic Steps

### "Login doesn't work / spinning forever / generic error"

**Step 1:** Open browser DevTools (F12) → **Network tab**
**Step 2:** Try to log in and watch what requests appear
**Step 3:** Find the request to `/api/auth/login` and check its status code:

| What you see | What it means | Fix |
|---|---|---|
| `OPTIONS /api/auth/login` → **400** | CORS preflight rejected — wrong `CORS_ORIGINS` | See CORS section above and INCIDENT-001 |
| `OPTIONS /api/auth/login` → **200**, then `POST` → **401** | Login reached the server but credentials are wrong | Check email/password are exactly right |
| `OPTIONS /api/auth/login` → **200**, then `POST` → **500** | Server error — backend crashed | Check Railway logs for Python traceback |
| No request appears at all | JavaScript error before request was made | Check Console tab (not Network) for red errors |
| Request hangs / times out | Backend unreachable | Check Railway — is the service running? |

---

### "Railway won't auto-deploy after I push code"

Railway → Service → Settings → Source → "Deploy on Push" must be ON and branch must be `main`.
This is a dashboard setting — not in any config file. You have to set it manually once.

---

### "Backend health check shows `db: error`"

Your `MONGO_URL` in Railway is wrong. Common mistakes:
- Left `<password>` placeholder in the string instead of replacing with real password
- Copied the connection string before setting up Network Access (0.0.0.0/0) in Atlas
- Special characters in your password not URL-encoded (safest: regenerate a password with only letters and numbers)

---

### "YouTube OAuth fails / redirect error"

- `YOUTUBE_REDIRECT_URI` in Railway must exactly match what's in Google Cloud Console
- No trailing slash, same protocol (https)
- OAuth consent screen must be configured in Google Cloud → APIs & Services → OAuth consent screen

---

### "Video generation shows black placeholder video"

This is expected behaviour when `VEO_API_KEY` is not set. Everything else works fine.

---

## Railway vs Vercel — What Each Platform Does

| | Railway | Vercel |
|---|---|---|
| What runs there | Python FastAPI server | React website (static files) |
| Auto-deploy trigger | Push to `main` branch (if enabled in dashboard) | Push to `main` branch (always on) |
| Environment variables | Set in Railway dashboard → Variables | Set in Vercel dashboard → Settings → Environment Variables |
| Logs | Railway dashboard → Deployments → click deploy → View Logs | Vercel dashboard → Functions tab (rarely needed) |
| How to redeploy manually | Railway → Deployments → Redeploy | Vercel → Deployments → Redeploy (or push a commit) |
| Free tier limits | $5 credit/mo (runs out; requires billing) | Free forever for frontend hosting |

---

## Environment Variables — Complete Reference

Variables you MUST set in Railway before the app works:

| Variable | Where to get it | Notes |
|---|---|---|
| `MONGO_URL` | MongoDB Atlas → Connect → Drivers | Replace `<password>` with real password |
| `DB_NAME` | Just type: `forgevoice_prod` | |
| `JWT_SECRET` | Run `openssl rand -hex 32` in terminal | Any random 64-char string works |
| `APP_ENV` | Just type: `production` | |
| `CORS_ORIGINS` | Your Vercel URL from Step 4 | Set AFTER you have Vercel URL. No trailing slash. |
| `GEMINI_API_KEY` | Google Cloud Console | For AI features |
| `YOUTUBE_CLIENT_ID` | Google Cloud Console → Credentials | For YouTube OAuth |
| `YOUTUBE_CLIENT_SECRET` | Google Cloud Console → Credentials | For YouTube OAuth |
| `YOUTUBE_API_KEY` | Google Cloud Console → Credentials | For YouTube data queries |
| `YOUTUBE_REDIRECT_URI` | Your Railway URL + `/api/oauth/callback/youtube` | Must match Google Cloud exactly |
| `BACKEND_PUBLIC_URL` | Your Railway URL | Used for generating OAuth redirect links |

Variables you can add later (app still works without them):

| Variable | Notes |
|---|---|
| `ELEVENLABS_API_KEY` | Voice synthesis — mock audio used without it |
| `VEO_API_KEY` | Video generation — placeholder videos used without it |
| `VIDEO_TEMP_DIR` | Set to `/tmp/fvs_video` |
