# Railway Veo Debug Guide

## Check Railway Logs

1. Go to: https://railway.app/dashboard
2. Click on your FVS project
3. Click on the backend service
4. Go to "Deployments" tab
5. Click on the latest deployment
6. Click "View Logs"

## What to Look For

When you try to generate a video in Content Studio, look for:

### Success Pattern:
```
Generating Veo 3.1 video (fast, 8s): Ancient Indian sage Chanakya...
```

### Error Patterns:

1. **API Key Missing:**
```
Veo not configured. Set GEMINI_API_KEY environment variable
```

2. **Invalid API Key:**
```
403 Forbidden
Invalid API key
```

3. **Duration Error:**
```
The number value for `durationSeconds` is out of bound
```

4. **Import Error:**
```
ImportError: cannot import name 'genai' from 'google'
```

## Quick Checks

### 1. Verify Environment Variable is Set
- Go to Railway → Backend Service → Variables tab
- Check that `GEMINI_API_KEY` is listed
- Value should be: `AIzaSyB-00uhT0oDCyCZmvtmI3aH0k1V57B7kdk`

### 2. Check Deployment Status
- Railway should show "Deployed" (green)
- Deployment time should be AFTER you added the API key

### 3. Test in Content Studio
- Go to: https://fvs-dash.vercel.app/dashboard/studio
- Enter topic: "Test video"
- Click Generate Script
- Click Generate Video
- Check Railway logs for the exact error

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Video generation failed" immediately | API key not set in Railway |
| Starts processing then fails | Check Railway logs for specific error |
| "Not authenticated" | Need to login to Content Studio |
| Works locally but not Railway | Environment variable not synced |

## Current Configuration

- **Provider**: Veo 3.1 (only provider)
- **Models**: veo-3.1-generate-preview (standard), veo-3.1-fast-generate-preview (fast)
- **Duration**: 8 seconds max
- **Cost**: ~$0.16 per video
- **API Key**: AIzaSyB-00uhT0oDCyCZmvtmI3aH0k1V57B7kdk