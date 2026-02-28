"""
OAuth 2.0 routes for platform connections.
Implements both real OAuth flow (when credentials are available) and mock flow for sandbox.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import os
import secrets
import hashlib
import base64
import json

from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import oauth_tokens_collection, publish_jobs_collection

router = APIRouter(prefix="/oauth", tags=["oauth"])

# Supported platforms
PLATFORMS = ["youtube", "tiktok", "instagram"]

# OAuth configuration - use real OAuth when credentials are available
def is_real_oauth_enabled(platform: str) -> bool:
    """Check if real OAuth credentials are configured for a platform."""
    if platform == "youtube":
        client_id = os.environ.get("YOUTUBE_CLIENT_ID")
        client_secret = os.environ.get("YOUTUBE_CLIENT_SECRET")
        return bool(client_id and client_secret and not client_id.startswith("mock_"))
    return False

MOCK_OAUTH_ENABLED = not is_real_oauth_enabled("youtube")  # Use mock if no real creds

# Mock account data for demo
MOCK_ACCOUNTS = {
    "youtube": {
        "name": "ForgeVoice Demo Channel",
        "handle": "@forgevoice_demo",
        "subscriberCount": "12.4K",
        "channelId": "UC_demo_channel_123"
    },
    "tiktok": {
        "name": "ForgeVoice TikTok",
        "handle": "@forgevoice_tiktok",
        "followerCount": "8.2K",
        "userId": "tiktok_demo_user_456"
    },
    "instagram": {
        "name": "ForgeVoice Reels",
        "handle": "@forgevoice_reels",
        "followerCount": "5.1K",
        "userId": "ig_demo_user_789"
    }
}

# Daily quota tracking (in-memory for demo, would be Redis in production)
_daily_quota = {}


def get_daily_quota_key():
    """Get key for today's quota tracking."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def get_quota_usage(client_id: str) -> dict:
    """Get current quota usage for a client."""
    key = f"{client_id}:{get_daily_quota_key()}"
    used = _daily_quota.get(key, 0)
    max_quota = 10000  # YouTube's daily quota
    return {
        "used": used,
        "max": max_quota,
        "remaining": max_quota - used,
        "percentUsed": round((used / max_quota) * 100, 1),
        "resetsAt": "Midnight PT"
    }


def consume_quota(client_id: str, units: int):
    """Consume quota units for a client."""
    key = f"{client_id}:{get_daily_quota_key()}"
    _daily_quota[key] = _daily_quota.get(key, 0) + units


# ============================================================================
# OAuth Status Endpoints
# ============================================================================

@router.get("/status")
async def get_oauth_status(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get OAuth connection status for all platforms.
    Returns connection status, account info, and token health.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = oauth_tokens_collection()
    
    tokens = await db.find({"clientId": client_id}, {"_id": 0}).to_list(100)
    tokens_by_platform = {t["platform"]: t for t in tokens}
    
    result = {}
    for platform in PLATFORMS:
        token = tokens_by_platform.get(platform)
        if token and token.get("connected"):
            # Check token expiry
            expires_at = token.get("expiresAt")
            token_status = "valid"
            if expires_at:
                expiry_time = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if expiry_time < datetime.now(timezone.utc):
                    token_status = "expired"
                elif expiry_time < datetime.now(timezone.utc) + timedelta(hours=1):
                    token_status = "expiring_soon"
            
            result[platform] = {
                "connected": True,
                "tokenStatus": token_status,
                "accountName": token.get("accountName"),
                "accountHandle": token.get("accountHandle"),
                "accountMeta": token.get("accountMeta", {}),
                "connectedAt": token.get("connectedAt"),
                "expiresAt": expires_at
            }
        else:
            result[platform] = {
                "connected": False,
                "tokenStatus": None,
                "accountName": None,
                "accountHandle": None,
                "accountMeta": {},
                "connectedAt": None,
                "expiresAt": None
            }
    
    return result


# ============================================================================
# OAuth Connect Flow (Mock Implementation)
# ============================================================================

@router.post("/connect/{platform}")
async def initiate_oauth_connect(
    platform: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Initiate OAuth 2.0 connection flow for a platform.
    In sandbox mode, returns a mock authorization URL.
    In production, would return real OAuth URL with PKCE challenge.
    """
    if platform not in PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    # Generate state and PKCE verifier
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode().rstrip("=")
    
    # Store state for callback verification (in production, use Redis with TTL)
    db = oauth_tokens_collection()
    await db.update_one(
        {"clientId": client_id, "platform": platform},
        {"$set": {
            "oauthState": state,
            "codeVerifier": code_verifier,
            "oauthInitiatedAt": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Determine if we should use real OAuth for this platform
    use_real_oauth = is_real_oauth_enabled(platform)
    
    # For mock mode or unsupported platforms, return mock auth URL
    if not use_real_oauth or platform != "youtube":
        # Mock OAuth URL points to our callback with pre-generated code
        mock_code = f"mock_auth_code_{secrets.token_urlsafe(16)}"
        base_url = os.environ.get("BACKEND_PUBLIC_URL", os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001"))
        auth_url = f"{base_url}/api/oauth/callback/{platform}?code={mock_code}&state={state}"
        
        return {
            "authUrl": auth_url,
            "state": state,
            "isMock": True,
            "popupWidth": 600,
            "popupHeight": 700
        }
    
    # Real YouTube OAuth URL with proper scopes
    redirect_uri = os.environ.get("YOUTUBE_REDIRECT_URI", f"{os.environ.get('BACKEND_PUBLIC_URL')}/api/oauth/callback/youtube")
    scopes = "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.upload"
    
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={os.environ.get('YOUTUBE_CLIENT_ID')}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={scopes}"
        f"&state={state}"
        f"&code_challenge={code_challenge}"
        f"&code_challenge_method=S256"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    
    return {
        "authUrl": auth_url,
        "state": state,
        "isMock": False,
        "popupWidth": 600,
        "popupHeight": 700
    }


@router.get("/callback/{platform}")
async def oauth_callback(
    platform: str,
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None)
):
    """
    Handle OAuth callback after user authorization.
    Exchanges code for tokens and stores them securely.
    Returns HTML that closes the popup and notifies parent window.
    """
    if error:
        return HTMLResponse(content=f"""
            <html>
            <body>
            <script>
                window.opener.postMessage({{ type: 'oauth_error', platform: '{platform}', error: '{error}' }}, '*');
                window.close();
            </script>
            <p>Authorization failed: {error}. This window will close automatically.</p>
            </body>
            </html>
        """)
    
    db = oauth_tokens_collection()
    
    # Find the token record with matching state
    token_record = await db.find_one({"oauthState": state, "platform": platform})
    if not token_record:
        return HTMLResponse(content=f"""
            <html>
            <body>
            <script>
                window.opener.postMessage({{ type: 'oauth_error', platform: '{platform}', error: 'Invalid state parameter' }}, '*');
                window.close();
            </script>
            <p>Invalid state. This window will close automatically.</p>
            </body>
            </html>
        """)
    
    client_id = token_record.get("clientId")
    
    # Mock token exchange
    if MOCK_OAUTH_ENABLED or code.startswith("mock_"):
        mock_data = MOCK_ACCOUNTS.get(platform, {})
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(hours=1)).isoformat()  # Mock tokens expire in 1 hour
        
        await db.update_one(
            {"clientId": client_id, "platform": platform},
            {"$set": {
                "connected": True,
                "accessToken": f"mock_access_{secrets.token_urlsafe(32)}",
                "refreshToken": f"mock_refresh_{secrets.token_urlsafe(32)}",
                "expiresAt": expires_at,
                "accountName": mock_data.get("name", "Demo Account"),
                "accountHandle": mock_data.get("handle", "@demo"),
                "accountMeta": {k: v for k, v in mock_data.items() if k not in ["name", "handle"]},
                "connectedAt": now.isoformat(),
                "updatedAt": now.isoformat(),
                "oauthState": None,
                "codeVerifier": None
            }}
        )
        
        return HTMLResponse(content=f"""
            <html>
            <head>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
                        color: white;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }}
                    .success-icon {{
                        width: 64px;
                        height: 64px;
                        background: rgba(34, 197, 94, 0.2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 16px;
                    }}
                    .success-icon svg {{
                        width: 32px;
                        height: 32px;
                        color: #22c55e;
                    }}
                    h2 {{
                        margin: 0 0 8px 0;
                        font-size: 20px;
                    }}
                    p {{
                        color: #94a3b8;
                        font-size: 14px;
                    }}
                </style>
            </head>
            <body>
                <div class="success-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2>Connected Successfully!</h2>
                <p>You can close this window now.</p>
                <script>
                    window.opener.postMessage({{ 
                        type: 'oauth_success', 
                        platform: '{platform}',
                        accountName: '{mock_data.get("name", "Demo Account")}',
                        accountHandle: '{mock_data.get("handle", "@demo")}'
                    }}, '*');
                    setTimeout(() => window.close(), 1500);
                </script>
            </body>
            </html>
        """)
    
    # Real OAuth: Exchange code for tokens
    import httpx
    
    code_verifier = token_record.get("codeVerifier")
    redirect_uri = os.environ.get("YOUTUBE_REDIRECT_URI", f"{os.environ.get('BACKEND_PUBLIC_URL')}/api/oauth/callback/youtube")
    
    try:
        async with httpx.AsyncClient() as http_client:
            token_response = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": os.environ.get("YOUTUBE_CLIENT_ID"),
                    "client_secret": os.environ.get("YOUTUBE_CLIENT_SECRET"),
                    "code": code,
                    "code_verifier": code_verifier,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri
                }
            )
            
            if token_response.status_code != 200:
                error_detail = token_response.text
                import logging
                logging.error(f"[OAuth] Token exchange FAILED for {platform}. Status: {token_response.status_code}. Google response: {error_detail}")
                return HTMLResponse(content=f"""
                    <html><body>
                    <script>
                        window.opener.postMessage({{ type: 'oauth_error', platform: '{platform}', error: 'Token exchange failed' }}, '*');
                        window.close();
                    </script>
                    <p>Token exchange failed: {error_detail}</p>
                    </body></html>
                """)
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            refresh_token_value = tokens.get("refresh_token")
            expires_in = tokens.get("expires_in", 3600)
            
            now = datetime.now(timezone.utc)
            expires_at = (now + timedelta(seconds=expires_in)).isoformat()
            
            # Fetch channel info using the new access token
            channel_info = None
            try:
                from services.youtube_sync_service import get_youtube_service_with_credentials, get_channel_info
                youtube = get_youtube_service_with_credentials(access_token, refresh_token_value)
                
                # Get channel info synchronously
                import asyncio
                channel_info = await get_channel_info(youtube)
            except Exception as e:
                import logging
                logging.error(f"Failed to fetch channel info: {e}")
            
            # Store tokens
            account_name = channel_info.get("title", "YouTube Channel") if channel_info else "YouTube Channel"
            account_handle = channel_info.get("customUrl", "@channel") if channel_info else "@channel"
            
            await db.update_one(
                {"clientId": client_id, "platform": platform},
                {"$set": {
                    "connected": True,
                    "accessToken": access_token,
                    "refreshToken": refresh_token_value,
                    "expiresAt": expires_at,
                    "accountName": account_name,
                    "accountHandle": account_handle,
                    "accountMeta": {
                        "subscriberCount": f"{channel_info.get('subscriberCount', 0):,}" if channel_info else "0",
                        "channelId": channel_info.get("channelId") if channel_info else None,
                        "uploadsPlaylistId": channel_info.get("uploadsPlaylistId") if channel_info else None
                    },
                    "channelId": channel_info.get("channelId") if channel_info else None,
                    "connectedAt": now.isoformat(),
                    "updatedAt": now.isoformat(),
                    "oauthState": None,
                    "codeVerifier": None
                }}
            )
            
            return HTMLResponse(content=f"""
                <html>
                <head>
                    <style>
                        body {{
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
                            color: white;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                        }}
                        .success-icon {{
                            width: 64px;
                            height: 64px;
                            background: rgba(34, 197, 94, 0.2);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-bottom: 16px;
                        }}
                        .success-icon svg {{ width: 32px; height: 32px; color: #22c55e; }}
                        h2 {{ margin: 0 0 8px 0; font-size: 20px; }}
                        p {{ color: #94a3b8; font-size: 14px; }}
                    </style>
                </head>
                <body>
                    <div class="success-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2>Connected to {account_name}!</h2>
                    <p>You can close this window now.</p>
                    <script>
                        window.opener.postMessage({{ 
                            type: 'oauth_success', 
                            platform: '{platform}',
                            accountName: '{account_name}',
                            accountHandle: '{account_handle}'
                        }}, '*');
                        setTimeout(() => window.close(), 1500);
                    </script>
                </body>
                </html>
            """)
            
    except Exception as e:
        import logging
        logging.exception("OAuth callback error")
        return HTMLResponse(content=f"""
            <html><body>
            <script>
                window.opener.postMessage({{ type: 'oauth_error', platform: '{platform}', error: 'Server error' }}, '*');
                window.close();
            </script>
            <p>Error: {str(e)}</p>
            </body></html>
        """)


@router.delete("/disconnect/{platform}")
async def disconnect_platform(
    platform: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Disconnect a platform by revoking and deleting OAuth tokens.
    """
    if platform not in PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = oauth_tokens_collection()
    
    # Find existing token
    token = await db.find_one({"clientId": client_id, "platform": platform})
    if not token or not token.get("connected"):
        raise HTTPException(status_code=404, detail="Platform not connected")
    
    # In production, would revoke token with the platform's API here
    
    # Delete the token record
    await db.delete_one({"clientId": client_id, "platform": platform})
    
    return {"success": True, "message": f"{platform} disconnected successfully"}


@router.post("/refresh/{platform}")
async def refresh_token(
    platform: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Refresh an expiring or expired OAuth token.
    """
    if platform not in PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")
    
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = oauth_tokens_collection()
    
    token = await db.find_one({"clientId": client_id, "platform": platform})
    if not token or not token.get("connected"):
        raise HTTPException(status_code=404, detail="Platform not connected")
    
    # Mock token refresh for mock connections
    if not is_real_oauth_enabled(platform) or token.get("accessToken", "").startswith("mock_"):
        now = datetime.now(timezone.utc)
        new_expires_at = (now + timedelta(hours=1)).isoformat()
        
        await db.update_one(
            {"clientId": client_id, "platform": platform},
            {"$set": {
                "accessToken": f"mock_access_{secrets.token_urlsafe(32)}",
                "expiresAt": new_expires_at,
                "updatedAt": now.isoformat()
            }}
        )
        
        return {
            "success": True,
            "expiresAt": new_expires_at,
            "message": "Token refreshed successfully"
        }
    
    # Real OAuth refresh using refresh_token
    refresh_token_value = token.get("refreshToken")
    if not refresh_token_value:
        raise HTTPException(status_code=400, detail="No refresh token available. Please reconnect.")
    
    try:
        import httpx
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": os.environ.get("YOUTUBE_CLIENT_ID"),
                    "client_secret": os.environ.get("YOUTUBE_CLIENT_SECRET"),
                    "refresh_token": refresh_token_value,
                    "grant_type": "refresh_token"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=400, detail="Token refresh failed. Please reconnect.")
            
            tokens = response.json()
            new_access_token = tokens.get("access_token")
            expires_in = tokens.get("expires_in", 3600)
            
            now = datetime.now(timezone.utc)
            new_expires_at = (now + timedelta(seconds=expires_in)).isoformat()
            
            await db.update_one(
                {"clientId": client_id, "platform": platform},
                {"$set": {
                    "accessToken": new_access_token,
                    "expiresAt": new_expires_at,
                    "updatedAt": now.isoformat()
                }}
            )
            
            return {
                "success": True,
                "expiresAt": new_expires_at,
                "message": "Token refreshed successfully"
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh error: {str(e)}")


# ============================================================================
# Quota Management
# ============================================================================

@router.get("/quota")
async def get_quota(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get current API quota usage for the client.
    Tracks YouTube API quota (10,000 units/day, ~1,600 per upload).
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    quota = get_quota_usage(client_id)
    
    # Add warning level
    if quota["percentUsed"] >= 95:
        quota["level"] = "critical"
        quota["message"] = "Quota nearly exhausted. Publishing disabled until reset."
    elif quota["percentUsed"] >= 80:
        quota["level"] = "warning"
        quota["message"] = "Quota running low. Consider limiting uploads."
    else:
        quota["level"] = "normal"
        quota["message"] = None
    
    return quota



# ============================================================================
# YouTube Channel Sync (The "Pulse" Engine)
# ============================================================================

@router.post("/youtube/sync")
async def sync_youtube_channel(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Trigger a full YouTube channel sync.
    Imports all Shorts, metadata, and analytics from the connected YouTube account.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = oauth_tokens_collection()
    
    # Get YouTube OAuth token
    token = await db.find_one({"clientId": client_id, "platform": "youtube"})
    if not token or not token.get("connected"):
        raise HTTPException(status_code=400, detail="YouTube not connected. Please connect your account first.")
    
    access_token = token.get("accessToken")
    refresh_token_value = token.get("refreshToken")
    
    if not access_token:
        raise HTTPException(status_code=400, detail="No access token available. Please reconnect.")
    
    # For mock tokens, return mock sync result
    if access_token.startswith("mock_"):
        return {
            "success": True,
            "channelInfo": {
                "channelId": "UC_demo_123",
                "title": "ForgeVoice Demo Channel",
                "subscriberCount": 12400
            },
            "shortsImported": 0,
            "assetsCreated": 0,
            "analyticsUpdated": 1,
            "message": "Mock sync completed. Connect a real YouTube account to import actual data.",
            "isMock": True
        }
    
    # Real sync
    try:
        from db.mongo import get_db
        from services.youtube_sync_service import sync_channel_data
        
        database = get_db()
        result = await sync_channel_data(
            db=database,
            client_id=client_id,
            access_token=access_token,
            refresh_token=refresh_token_value
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("errors", ["Sync failed"])[0])
        
        return {
            "success": True,
            "channelInfo": result.get("channelInfo"),
            "shortsImported": result.get("shortsImported", 0),
            "assetsCreated": result.get("assetsCreated", 0),
            "analyticsUpdated": result.get("analyticsUpdated", 0),
            "message": f"Successfully imported {result.get('shortsImported', 0)} Shorts from your channel.",
            "isMock": False
        }
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.exception("YouTube sync error")
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")


@router.get("/youtube/sync/status")
async def get_sync_status(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get the last sync status and statistics.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    
    from db.mongo import get_db
    database = get_db()
    
    # Get latest sync snapshot
    latest_snapshot = await database.analytics_snapshots.find_one(
        {"clientId": client_id, "source": "youtube_sync"},
        sort=[("createdAt", -1)]
    )
    
    # Get imported shorts count
    imported_count = await database.submissions.count_documents({
        "clientId": client_id,
        "importedFromYoutube": True
    })
    
    return {
        "lastSyncAt": latest_snapshot.get("createdAt") if latest_snapshot else None,
        "totalImportedShorts": imported_count,
        "channelStats": {
            "subscriberCount": latest_snapshot.get("subscriberCount") if latest_snapshot else None,
            "totalViews": latest_snapshot.get("totalViews") if latest_snapshot else None,
            "shortsCount": latest_snapshot.get("shortsCount") if latest_snapshot else None
        } if latest_snapshot else None
    }
