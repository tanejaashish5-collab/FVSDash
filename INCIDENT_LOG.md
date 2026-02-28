# FVSDash — Incident Log & Post-Mortems

> This file records every production issue encountered, the root cause, the fix, and lessons learned.
> When we deploy the next app, read this file first.

---

## INCIDENT-001 — Login Broken After First Deployment
**Date:** 2026-02-28
**Severity:** Critical (app completely unusable — no one could log in)
**Time to resolve:** ~2 hours of back-and-forth

---

### What Happened (Plain English)

After deploying the app to Railway (backend) and Vercel (frontend), logging in with `admin@forgevoice.com` / `admin123` failed silently. The login button appeared to do nothing or showed a generic error.

---

### The Investigation — Chain of Thought

**Step 1: Where do we even look?**

When something breaks in a deployed app, there are 3 places to check:
1. **Browser Console** (F12 → Console tab) — what error does the browser report?
2. **Browser Network tab** (F12 → Network tab) — what HTTP requests are being made and what status codes come back?
3. **Railway Logs** — what is the backend server actually doing?

We should have gone to the Railway logs FIRST. Instead we spent time trying to fix code that wasn't the problem. **Lesson: Always check logs before changing code.**

---

**Step 2: What the Railway log showed**

```
100.64.0.3:60246 – "OPTIONS /api/auth/login HTTP/1.1" 400 Bad Request
```

This one line tells us everything if you know how to read it:

| Part | What it means |
|------|---------------|
| `OPTIONS` | This is NOT the login request itself. This is a "preflight check" the browser sends FIRST before any cross-origin API call. |
| `/api/auth/login` | The endpoint the browser is trying to reach |
| `400 Bad Request` | The server rejected the preflight — login never even got a chance to run |

---

**Step 3: Understanding CORS (Why This Happens)**

**CORS = Cross-Origin Resource Sharing.** It's a browser security feature.

Here's the simplified model:

```
Your Frontend lives at:   https://fvsdash.vercel.app        (Origin A)
Your Backend lives at:    https://fvsdash-production.railway.app  (Origin B)
```

When JavaScript on Origin A tries to call Origin B, the browser says:
> "Wait — I need to check if Origin B allows this before I send real data."

So the browser sends a **preflight request** — an `OPTIONS` HTTP call — to Origin B asking:
> "Hey, does `https://fvsdash.vercel.app` have permission to talk to you?"

The server must reply: "Yes, that origin is allowed."

If the server says anything other than that (including 400 Bad Request), the browser **blocks** the actual login request completely. The user sees nothing useful — just a failed login.

---

**Step 4: Why the server was rejecting the preflight**

In `backend/main.py`, the CORS configuration reads an environment variable:

```python
_cors_origins_raw = os.environ.get('CORS_ORIGINS', '').strip()

if not _cors_origins_raw or _cors_origins_raw == '*':
    _allow_origins = ["*"]          # Allow ALL origins → preflight always passes
else:
    _allow_origins = [specific_urls]  # Only allow these specific URLs
```

The `CORS_ORIGINS` variable was set in Railway (during setup following the DEPLOY.md guide) to something that did **not** include the actual Vercel frontend URL. So the server was checking: "Is the frontend's domain in my allowed list?" — and saying no → 400.

**The key misunderstanding:** `CORS_ORIGINS` must contain the URL where the **frontend page is served from** (e.g. `https://fvsdash.vercel.app`), NOT the backend URL, and NOT the `REACT_APP_BACKEND_URL` value.

---

**Step 5: The Fix**

In Railway → Variables → delete the `CORS_ORIGINS` variable entirely.

This made the code fall into the `if not _cors_origins_raw` branch → `allow_origins=["*"]` → all origins allowed → preflight returns 200 → login works.

The longer-term correct fix (done in DEPLOY.md update) is to set `CORS_ORIGINS` to exactly your Vercel URL.

---

### Root Cause

`CORS_ORIGINS` environment variable was set in Railway to an incorrect value (not matching the frontend's Vercel domain), causing Starlette's CORSMiddleware to return HTTP 400 on every CORS preflight request, blocking all API calls from the browser.

---

### Contributing Factors

1. **DEPLOY.md said to set `CORS_ORIGINS = https://your-vercel-url.vercel.app` but with a placeholder** — it was easy to set the wrong value or forget to update it after Vercel deployment
2. **No immediate validation step** — after setting variables, the guide didn't say "test CORS right now before moving on"
3. **400 vs 403 confusion** — a 400 from CORS is non-obvious; most people expect a CORS error to look like a 403 Forbidden or a `CORS policy` message in the browser console, not a 400 Bad Request in server logs

---

### Secondary Issue — Railway Auto-Deploy Didn't Trigger

After merging a PR on GitHub, Railway did not automatically redeploy. User had to manually click "Redeploy" in the Railway dashboard.

**Why this happens:** Railway's auto-deploy is configured in the Railway dashboard, not in `railway.json`. The trigger is a GitHub webhook that fires on push to the connected branch. If:
- The connected branch in Railway doesn't match the branch you pushed to, OR
- The Railway GitHub App lost permissions, OR
- The webhook failed silently

...Railway won't auto-deploy. This is a Railway dashboard setting, not a code issue.

**Fix:** Railway → Service → Settings → Source → confirm "Deploy on Push" is ON and the branch is `main`.

---

### What Good Debugging Looks Like (For Next Time)

When login (or any feature) is broken after deployment, follow this exact sequence:

```
1. Open Browser DevTools (F12)
   └── Network tab → filter by XHR/Fetch
   └── Try the action
   └── Look at what request failed and what status code it returned

2. If you see OPTIONS → 4xx:
   └── This is a CORS error
   └── Go to Railway → Logs
   └── Find the OPTIONS line
   └── Check CORS_ORIGINS env variable

3. If you see POST → 4xx or 5xx:
   └── Go to Railway → Logs
   └── Find the matching request
   └── Read the error message or stack trace

4. If the request never appears in Network tab:
   └── The error is in JavaScript (frontend)
   └── Check Console tab instead

5. Only change code AFTER you've confirmed what the actual error is
```

---

### Changes Made to Prevent Recurrence

1. **DEPLOY.md updated** — Step 3 now has a warning box explaining CORS_ORIGINS, what value to use, and an immediate verification step
2. **DEPLOY.md Troubleshooting** — expanded with specific status codes, what they mean, and exact fix steps
3. **This incident log created** — so future deployments start with awareness of this pitfall

---

## Template for Future Incidents

```
## INCIDENT-XXX — [Short Title]
**Date:** YYYY-MM-DD
**Severity:** Critical / High / Medium / Low
**Time to resolve:**

### What Happened

### Chain of Thought Investigation

### Root Cause

### Fix Applied

### Changes Made to Prevent Recurrence
```
