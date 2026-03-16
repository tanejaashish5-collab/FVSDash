"""
YouTube OAuth Authentication Script
Run this to authenticate and save tokens to database
"""

import os
import sys
import asyncio
import webbrowser
from urllib.parse import urlencode, urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import json
from datetime import datetime, timezone, timedelta

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

# OAuth configuration from environment
CLIENT_ID = os.environ.get("YOUTUBE_CLIENT_ID")
CLIENT_SECRET = os.environ.get("YOUTUBE_CLIENT_SECRET")
# Use the redirect URI that's already configured in Google Cloud Console
REDIRECT_URI = os.environ.get("YOUTUBE_REDIRECT_URI", "http://localhost:8000/api/oauth/youtube/callback")
MONGO_URL = os.environ.get("MONGO_URL")

if not CLIENT_ID or not CLIENT_SECRET:
    print("❌ YouTube OAuth credentials not found in .env")
    print("Please add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET")
    sys.exit(1)

if not MONGO_URL:
    print("❌ MongoDB URL not found in .env")
    sys.exit(1)

# OAuth scopes
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.readonly"
]

# Global to capture the authorization code
auth_code = None

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """Simple HTTP handler to capture OAuth callback"""

    def do_GET(self):
        global auth_code

        # Parse the query parameters
        query = urlparse(self.path).query
        params = parse_qs(query)

        if "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            html = """
                <html>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                    <h1 style="color: green;">✅ Authentication Successful!</h1>
                    <p>You can close this window and return to the terminal.</p>
                </body>
                </html>
            """
            self.wfile.write(html.encode())
        else:
            error = params.get("error", ["Unknown error"])[0]
            self.send_response(400)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(f"""
                <html>
                <body style="font-family: Arial; padding: 50px; text-align: center;">
                    <h1 style="color: red;">❌ Authentication Failed</h1>
                    <p>Error: {error}</p>
                </body>
                </html>
            """.encode())

    def log_message(self, format, *args):
        # Suppress default logging
        pass


async def save_tokens_to_database(tokens):
    """Save tokens to MongoDB"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.fvs_production

    token_data = {
        "clientId": "chanakya-sutra",
        "platform": "youtube",
        "accessToken": tokens["access_token"],
        "refreshToken": tokens.get("refresh_token"),
        "expiresAt": (
            datetime.now(timezone.utc) + timedelta(seconds=tokens.get("expires_in", 3600))
        ).isoformat(),
        "scope": tokens.get("scope", " ".join(SCOPES)),
        "connected": True,
        "channelName": "Chanakya Sutra",
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }

    # Upsert the token
    result = await db.oauth_tokens.update_one(
        {"clientId": "chanakya-sutra", "platform": "youtube"},
        {"$set": token_data},
        upsert=True
    )

    print("\n✅ Tokens saved to database!")
    print(f"   Client: chanakya-sutra")
    print(f"   Platform: youtube")
    print(f"   Access Token: {tokens['access_token'][:30]}...")
    if tokens.get("refresh_token"):
        print(f"   Refresh Token: {tokens['refresh_token'][:30]}...")
    else:
        print("   ⚠️  No refresh token received (re-auth with prompt=consent)")

    return result


def main():
    print("\n🎥 YouTube OAuth Authentication for Chanakya Sutra")
    print("=" * 60)
    print(f"Client ID: {CLIENT_ID[:30]}...")
    print(f"Client Secret: {CLIENT_SECRET[:15]}...")
    print("\nStarting OAuth flow...\n")

    # Build authorization URL
    auth_params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent"  # Force consent to get refresh token
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"

    # Start local server to capture callback
    server = HTTPServer(("localhost", 8080), OAuthCallbackHandler)
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()

    print("1. Opening browser for authentication...")
    print(f"   URL: {auth_url[:100]}...")
    webbrowser.open(auth_url)

    print("\n2. Please authorize the application in your browser")
    print("   (Listening on http://localhost:8080/callback)")

    # Wait for authorization code
    while auth_code is None:
        pass

    server.shutdown()

    print("\n3. Authorization code received!")
    print(f"   Code: {auth_code[:20]}...")

    # Exchange code for tokens
    print("\n4. Exchanging code for tokens...")

    token_data = {
        "code": auth_code,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "grant_type": "authorization_code"
    }

    response = requests.post("https://oauth2.googleapis.com/token", data=token_data)

    if response.status_code == 200:
        tokens = response.json()
        print("   ✅ Tokens received successfully!")

        # Save to database
        print("\n5. Saving tokens to database...")
        asyncio.run(save_tokens_to_database(tokens))

        print("\n" + "=" * 60)
        print("🎉 AUTHENTICATION COMPLETE!")
        print("   Videos will now auto-upload to YouTube")
        print("   Tomorrow's long-form will publish at 8 PM IST")
        print("=" * 60)

    else:
        print(f"   ❌ Token exchange failed: {response.status_code}")
        print(f"   Error: {response.text}")
        sys.exit(1)


if __name__ == "__main__":
    main()