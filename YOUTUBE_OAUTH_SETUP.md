# YouTube OAuth Setup Guide for FVS

## Prerequisites
- Google Cloud Console access
- YouTube channel (Chanakya Sutra)
- Admin access to FVS backend

## Step 1: Create OAuth 2.0 Credentials in Google Cloud

### 1.1 Go to Google Cloud Console
```
https://console.cloud.google.com/apis/credentials
```

### 1.2 Create OAuth Consent Screen (if not already done)
1. Click "OAuth consent screen" in left sidebar
2. Choose "External" (for public YouTube channel)
3. Fill in required fields:
   - App name: "ForgeVoice Studio"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.readonly`
5. Add your email as test user (if in testing mode)
6. Save and continue

### 1.3 Create OAuth 2.0 Client ID
1. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
2. Application type: "Web application"
3. Name: "FVS YouTube Publisher"
4. Authorized redirect URIs - ADD BOTH:
   ```
   http://localhost:8000/api/oauth/youtube/callback
   https://fvsdash-production.up.railway.app/api/oauth/youtube/callback
   ```
5. Click "Create"
6. Download the JSON file (keep it safe!)

## Step 2: Configure Backend Environment

### 2.1 Add to `.env` file
```bash
# YouTube OAuth Configuration
YOUTUBE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-your-client-secret-here
YOUTUBE_REDIRECT_URI=http://localhost:8000/api/oauth/youtube/callback
```

### 2.2 For Railway Production
Add these environment variables in Railway dashboard:
```
YOUTUBE_CLIENT_ID=your-client-id-here
YOUTUBE_CLIENT_SECRET=your-client-secret-here
YOUTUBE_REDIRECT_URI=https://fvsdash-production.up.railway.app/api/oauth/youtube/callback
```

## Step 3: Initial Authentication (One-Time)

### 3.1 Manual OAuth Flow
Run this script locally to get initial tokens:

```python
# save as: authenticate_youtube.py
import os
import json
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request

# Your OAuth credentials
CLIENT_CONFIG = {
    "installed": {
        "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
        "client_secret": "GOCSPX-YOUR_CLIENT_SECRET",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["http://localhost:8080"]
    }
}

SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly'
]

def authenticate():
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        redirect_uri='http://localhost:8080'
    )

    # Get authorization URL
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'  # Force consent to get refresh token
    )

    print(f"1. Open this URL in browser:\n{auth_url}\n")
    print("2. Authorize the app")
    print("3. Copy the 'code' parameter from redirect URL")

    auth_code = input("4. Paste authorization code here: ")

    # Exchange code for tokens
    flow.fetch_token(code=auth_code)

    # Save credentials
    creds = flow.credentials
    token_data = {
        'token': creds.token,
        'refresh_token': creds.refresh_token,
        'token_uri': creds.token_uri,
        'client_id': creds.client_id,
        'client_secret': creds.client_secret,
        'scopes': creds.scopes
    }

    with open('youtube_token.json', 'w') as f:
        json.dump(token_data, f, indent=2)

    print("\n✅ Authentication successful!")
    print("Token saved to youtube_token.json")
    print(f"Access Token: {creds.token[:20]}...")
    print(f"Refresh Token: {creds.refresh_token[:20]}...")

    return token_data

if __name__ == "__main__":
    authenticate()
```

### 3.2 Alternative: Use FVS OAuth Endpoint
1. Start backend: `uvicorn main:app --port 8000`
2. Open browser: `http://localhost:8000/api/oauth/youtube/authorize?client_id=chanakya-sutra`
3. Authorize with your YouTube account
4. You'll be redirected back with success message

## Step 4: Store Tokens in Database

### 4.1 Manual Token Storage (if needed)
```python
# Run in Python after getting tokens
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta

async def store_token():
    # Connect to MongoDB
    client = AsyncIOMotorClient("YOUR_MONGO_URL")
    db = client.fvs_production

    # Token data from youtube_token.json
    token_data = {
        "clientId": "chanakya-sutra",
        "platform": "youtube",
        "accessToken": "ya29.your-access-token",
        "refreshToken": "1//your-refresh-token",
        "expiresAt": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "scope": "https://www.googleapis.com/auth/youtube.upload",
        "connected": True,
        "channelName": "Chanakya Sutra",
        "channelId": "YOUR_CHANNEL_ID",
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }

    # Upsert token
    await db.oauth_tokens.update_one(
        {"clientId": "chanakya-sutra", "platform": "youtube"},
        {"$set": token_data},
        upsert=True
    )

    print("✅ Token stored in database")

asyncio.run(store_token())
```

## Step 5: Test Upload

### 5.1 Test Script
```python
# test_youtube_upload.py
import asyncio
from services.youtube_upload_service import upload_to_youtube

async def test():
    result = await upload_to_youtube(
        user_id="chanakya-sutra",
        video_path="/path/to/test-video.mp4",
        title="Test Upload - Chanakya Wisdom",
        description="Testing automated upload",
        tags=["chanakya", "test"],
        privacy="private"  # Start with private for testing
    )

    if result:
        print(f"✅ Upload successful! Video ID: {result['video_id']}")
        print(f"URL: https://youtube.com/watch?v={result['video_id']}")
    else:
        print("❌ Upload failed")

asyncio.run(test())
```

## Step 6: Enable Automation

Once tokens are stored and tested:

1. The scheduler will automatically use stored tokens
2. Videos will upload at scheduled times (8 PM IST)
3. Check logs for upload status:
   ```bash
   grep "YouTube upload" backend.log
   ```

## Troubleshooting

### Common Issues:

1. **"No refresh token"**
   - Add `prompt='consent'` when authorizing
   - Revoke access and re-authenticate

2. **"Quota exceeded"**
   - YouTube Data API has daily quota (10,000 units)
   - Each upload costs 1,600 units
   - Max ~6 uploads per day

3. **"Invalid credentials"**
   - Check YOUTUBE_CLIENT_SECRET in .env
   - Ensure redirect URI matches exactly

4. **"Token expired"**
   - System should auto-refresh using refresh_token
   - If not, re-authenticate manually

## Security Notes

- NEVER commit credentials to Git
- Keep youtube_token.json in .gitignore
- Store tokens encrypted in production DB
- Rotate refresh tokens periodically

## Quick Commands

```bash
# Check if YouTube credentials exist
python3 -c "import os; print('YouTube configured' if os.getenv('YOUTUBE_CLIENT_SECRET') else 'Not configured')"

# Check token in database
python3 -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def check():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    token = await client.fvs_production.oauth_tokens.find_one({'clientId': 'chanakya-sutra'})
    print('Token exists' if token else 'No token')

asyncio.run(check())
"
```

## Next Steps

1. Complete OAuth setup in Google Cloud Console
2. Add credentials to .env and Railway
3. Authenticate once to get tokens
4. Test with private video upload
5. Switch to public/unlisted for production

---
Last Updated: March 2026