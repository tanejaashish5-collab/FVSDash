"""
ForgeVoice Studio API - Main Application Entry Point

This is the new modular FastAPI application structure.
All routes are organized into separate router modules in the /routers directory.
"""
from fastapi import FastAPI, APIRouter, Request
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
import tempfile

# Rate limiter — uses in-memory storage by default (Redis can be added later via REDIS_URL)
limiter = Limiter(key_func=get_remote_address)

# Import routers
from routers import (
    auth, dashboard, submissions, assets, calendar,
    deliverables, analytics, roi, billing, settings,
    help, blog, ai, video_tasks, fvs, admin, channel_profile,
    publishing, strategy_session, notifications, oauth, youtube_publish,
    trends, brain, dev, search, pipeline, video_editor, templates,
    podcast_studio, social_publish,
)

# Import database utilities
from db.mongo import get_db, close_client

# Import seed module
from seed import run_seed

# Import scheduler
from services.publishing_scheduler import start_scheduler, stop_scheduler

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Sentry error tracking — only active when SENTRY_DSN is set in Railway env vars
_sentry_dsn = os.environ.get("SENTRY_DSN")
if _sentry_dsn:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
        sentry_sdk.init(
            dsn=_sentry_dsn,
            integrations=[StarletteIntegration(), FastApiIntegration()],
            traces_sample_rate=0.1,
            environment=os.environ.get("RAILWAY_ENVIRONMENT", "production"),
        )
        logger.info("Sentry error tracking initialized")
    except ImportError:
        logger.warning("sentry-sdk not installed — skipping Sentry init (run: pip install sentry-sdk[fastapi])")

# Create FastAPI app
app = FastAPI(title="ForgeVoice Studio API")

# Attach rate limiter to app state and add exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Include all routers
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(submissions.router)
api_router.include_router(assets.router)
api_router.include_router(calendar.router)
api_router.include_router(deliverables.router)
api_router.include_router(analytics.router)
api_router.include_router(roi.router)
api_router.include_router(billing.router)
api_router.include_router(settings.router)
api_router.include_router(help.router)
api_router.include_router(blog.router)
api_router.include_router(ai.router)
api_router.include_router(video_tasks.router)
api_router.include_router(fvs.router)
api_router.include_router(admin.router)
api_router.include_router(channel_profile.router)
api_router.include_router(publishing.router)
api_router.include_router(strategy_session.router)
api_router.include_router(notifications.router)
api_router.include_router(oauth.router)
api_router.include_router(youtube_publish.router)
api_router.include_router(trends.router)
api_router.include_router(brain.router)
api_router.include_router(dev.router)
api_router.include_router(search.router)
api_router.include_router(pipeline.router)
api_router.include_router(video_editor.router)
api_router.include_router(templates.router)
api_router.include_router(podcast_studio.router)
api_router.include_router(social_publish.router)

# ---------------------------------------------------------------------------
# Local file serving — active when S3 is not configured.
# Files uploaded via StorageService land in /app/uploads/ and are served here
# so the browser can load clips, stitched videos, thumbnails, and audio files
# without needing S3 or a presigned URL.
# ---------------------------------------------------------------------------
from fastapi.responses import FileResponse as _FileResponse
from pathlib import Path as _Path

@api_router.get("/files/{file_path:path}", include_in_schema=False)
async def serve_uploaded_file(file_path: str):
    """Serve a locally-stored file (S3 fallback). Converts /api/files/{key} → disk path."""
    from services.storage_service import LOCAL_STORAGE_DIR
    safe_path = _Path(LOCAL_STORAGE_DIR) / file_path
    # Prevent path traversal
    try:
        safe_path = safe_path.resolve()
        LOCAL_STORAGE_DIR.resolve()
        safe_path.relative_to(LOCAL_STORAGE_DIR.resolve())
    except (ValueError, RuntimeError):
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=400, detail="Invalid file path")
    if not safe_path.exists() or not safe_path.is_file():
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=404, detail="File not found")
    return _FileResponse(str(safe_path))

# Include API router in app
app.include_router(api_router)

# Add CORS middleware
# NOTE: allow_credentials=True is incompatible with allow_origins=['*'] (browser rejects it).
# When CORS_ORIGINS is not set we fall back to wildcard with credentials disabled,
# which is safe because the app uses Authorization headers (not cookies).
_cors_origins_raw = os.environ.get('CORS_ORIGINS', '').strip()
if not _cors_origins_raw or _cors_origins_raw == '*':
    _allow_origins = ["*"]
    _allow_credentials = False
else:
    _allow_origins = [o.strip() for o in _cors_origins_raw.split(',') if o.strip()]
    _allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_credentials=_allow_credentials,
    allow_origins=_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint for Railway deployment."""
    db_status = "ok"
    try:
        db = get_db()
        await db.command("ping")
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "service": "ForgeVoice Studio API",
        "db": db_status
    }


@app.get("/privacy")
@app.get("/api/privacy")
async def privacy_policy():
    """Privacy Policy page for TikTok/Instagram OAuth app verification."""
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - ForgeVoice Studio</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        h1 { color: #0f172a; }
        h2 { color: #1e293b; margin-top: 30px; }
        .last-updated { color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <h1>Privacy Policy</h1>
    <p class="last-updated">Last Updated: March 13, 2026</p>

    <h2>1. Introduction</h2>
    <p>ForgeVoice Studio ("we", "our", or "us") operates an automated content creation and publishing platform. This Privacy Policy explains how we collect, use, and protect your information when you use our service.</p>

    <h2>2. Information We Collect</h2>
    <p><strong>OAuth Account Information:</strong> When you connect your YouTube, TikTok, or Instagram account, we collect:</p>
    <ul>
        <li>Account name and handle</li>
        <li>Profile information</li>
        <li>Access tokens (encrypted)</li>
    </ul>

    <p><strong>Content Data:</strong> Videos, scripts, and metadata generated through our platform.</p>

    <h2>3. How We Use Your Information</h2>
    <p>We use your information solely to:</p>
    <ul>
        <li>Publish content to your connected social media accounts</li>
        <li>Generate analytics and performance reports</li>
        <li>Improve our content generation algorithms</li>
    </ul>

    <h2>4. Data Storage and Security</h2>
    <p>Your data is stored securely in encrypted MongoDB databases. OAuth tokens are encrypted at rest and in transit. We never share your personal information with third parties except as required to provide our services (e.g., posting to YouTube/TikTok/Instagram via their official APIs).</p>

    <h2>5. Third-Party Services</h2>
    <p>We integrate with:</p>
    <ul>
        <li>YouTube API Services (Google)</li>
        <li>TikTok for Developers</li>
        <li>Instagram/Facebook Graph API</li>
        <li>Kling AI (fal.ai)</li>
        <li>Google Gemini</li>
        <li>ElevenLabs</li>
    </ul>
    <p>Each service has its own privacy policy governing data usage.</p>

    <h2>6. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
        <li>Disconnect your accounts at any time</li>
        <li>Request deletion of your data</li>
        <li>Export your content</li>
        <li>Revoke OAuth permissions</li>
    </ul>

    <h2>7. Data Retention</h2>
    <p>We retain your data only as long as your account is active or as needed to provide services. Upon account deletion, all data is permanently removed within 30 days.</p>

    <h2>8. Children's Privacy</h2>
    <p>Our service is not directed to individuals under 13 years of age. We do not knowingly collect personal information from children.</p>

    <h2>9. Changes to This Policy</h2>
    <p>We may update this policy periodically. Continued use of our service after changes constitutes acceptance of the updated policy.</p>

    <h2>10. Contact Us</h2>
    <p>For privacy concerns or data requests, contact us at: <strong>privacy@forgevoice.com</strong></p>

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #e2e8f0;">
    <p style="text-align: center; color: #94a3b8; font-size: 14px;">ForgeVoice Studio &copy; 2026. All rights reserved.</p>
</body>
</html>
    """)


@app.get("/terms")
@app.get("/api/terms")
async def terms_of_service():
    """Terms of Service page for TikTok/Instagram OAuth app verification."""
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content="""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - ForgeVoice Studio</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        h1 { color: #0f172a; }
        h2 { color: #1e293b; margin-top: 30px; }
        .last-updated { color: #64748b; font-size: 14px; }
    </style>
</head>
<body>
    <h1>Terms of Service</h1>
    <p class="last-updated">Last Updated: March 13, 2026</p>

    <h2>1. Acceptance of Terms</h2>
    <p>By accessing and using ForgeVoice Studio ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

    <h2>2. Description of Service</h2>
    <p>ForgeVoice Studio is an automated content creation and publishing platform that:</p>
    <ul>
        <li>Generates video content using AI tools</li>
        <li>Publishes content to YouTube, TikTok, and Instagram on your behalf</li>
        <li>Provides analytics and performance tracking</li>
    </ul>

    <h2>3. User Accounts</h2>
    <p>You are responsible for:</p>
    <ul>
        <li>Maintaining the confidentiality of your account credentials</li>
        <li>All activities that occur under your account</li>
        <li>Ensuring your connected social media accounts comply with platform policies</li>
    </ul>

    <h2>4. Content Ownership</h2>
    <p>You retain full ownership of content created through our platform. We claim no intellectual property rights over your generated videos, scripts, or other materials.</p>

    <h2>5. Platform Compliance</h2>
    <p>You agree to:</p>
    <ul>
        <li>Comply with YouTube, TikTok, and Instagram Terms of Service</li>
        <li>Not use the Service to generate misleading, harmful, or illegal content</li>
        <li>Not violate any third-party copyrights or trademarks</li>
    </ul>

    <h2>6. Service Usage and Fees</h2>
    <p>The Service may incur usage costs based on:</p>
    <ul>
        <li>AI video generation (Kling AI)</li>
        <li>Voice synthesis (ElevenLabs)</li>
        <li>Script generation (Google Gemini)</li>
    </ul>
    <p>You are responsible for monitoring and controlling your usage costs.</p>

    <h2>7. Service Availability</h2>
    <p>We strive for 99% uptime but do not guarantee uninterrupted service. Scheduled maintenance and third-party API outages may cause temporary disruptions.</p>

    <h2>8. Prohibited Activities</h2>
    <p>You may not:</p>
    <ul>
        <li>Use the Service for spam or automated abuse</li>
        <li>Attempt to access unauthorized areas of the system</li>
        <li>Reverse engineer or copy our proprietary algorithms</li>
        <li>Resell or redistribute our Service without permission</li>
    </ul>

    <h2>9. Termination</h2>
    <p>We reserve the right to suspend or terminate accounts that violate these Terms. You may terminate your account at any time by disconnecting all OAuth connections.</p>

    <h2>10. Limitation of Liability</h2>
    <p>ForgeVoice Studio is provided "as is" without warranties. We are not liable for:</p>
    <ul>
        <li>Content rejected or removed by social media platforms</li>
        <li>Account suspensions due to platform policy violations</li>
        <li>Third-party API failures or cost overruns</li>
    </ul>

    <h2>11. Indemnification</h2>
    <p>You agree to indemnify ForgeVoice Studio against claims arising from your use of the Service, including content you publish and platform violations.</p>

    <h2>12. Changes to Terms</h2>
    <p>We may modify these Terms at any time. Continued use after changes constitutes acceptance of updated Terms.</p>

    <h2>13. Governing Law</h2>
    <p>These Terms are governed by the laws of Australia (ACT jurisdiction).</p>

    <h2>14. Contact</h2>
    <p>For questions about these Terms, contact: <strong>legal@forgevoice.com</strong></p>

    <hr style="margin: 40px 0; border: none; border-top: 1px solid #e2e8f0;">
    <p style="text-align: center; color: #94a3b8; font-size: 14px;">ForgeVoice Studio &copy; 2026. All rights reserved.</p>
</body>
</html>
    """)


def _bootstrap_gcp_credentials():
    """
    If GOOGLE_APPLICATION_CREDENTIALS_JSON is set (Railway env var containing
    the full service account JSON), write it to a temp file and point
    GOOGLE_APPLICATION_CREDENTIALS at it so the google-auth library can find it.
    """
    creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
    if creds_json and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                f.write(creds_json)
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = f.name
            logging.getLogger(__name__).info("GCP credentials written from GOOGLE_APPLICATION_CREDENTIALS_JSON")
        except Exception as e:
            logging.getLogger(__name__).warning(f"Failed to write GCP credentials: {e}")

_bootstrap_gcp_credentials()


@app.on_event("startup")
async def startup():
    """Initialize database indexes and seed data on startup."""
    try:
        db = get_db()
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.clients.create_index("id", unique=True)
        await db.publishing_tasks.create_index("clientId")
        await db.publishing_tasks.create_index([("status", 1), ("scheduledAt", 1)])
        await db.platform_connections.create_index([("clientId", 1), ("platform", 1)], unique=True)
        await db.oauth_tokens.create_index([("clientId", 1), ("platform", 1)], unique=True)
        await db.publish_jobs.create_index("clientId")
        await db.publish_jobs.create_index([("status", 1), ("createdAt", -1)])
        await db.brain_scores.create_index("user_id")
        await db.brain_scores.create_index([("user_id", 1), ("performance_verdict", 1)])
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Index creation error (non-fatal): {e}")

    try:
        result = await run_seed()
        if result:
            logger.info("Demo data seeded successfully")

        # Run identity migration (Sprint 12)
        from migrations.versions.s12_identity_fix import run_identity_migration
        db = get_db()
        await run_identity_migration(db)
    except Exception as e:
        logger.error(f"Seed error: {e}")
    
    # Start the publishing scheduler
    start_scheduler()

    # Log which AI providers are configured
    from services.ai_service import check_ai_providers
    check_ai_providers()


@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown."""
    stop_scheduler()
    close_client()
