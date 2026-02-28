"""
ForgeVoice Studio API - Main Application Entry Point

This is the new modular FastAPI application structure.
All routes are organized into separate router modules in the /routers directory.
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import os
import logging
import tempfile

# Import routers
from routers import (
    auth, dashboard, submissions, assets, calendar,
    deliverables, analytics, roi, billing, settings,
    help, blog, ai, video_tasks, fvs, admin, channel_profile,
    publishing, strategy_session, notifications, oauth, youtube_publish,
    trends, brain, dev, search, pipeline
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


@app.on_event("shutdown")
async def shutdown_db_client():
    """Close database connection on shutdown."""
    stop_scheduler()
    close_client()
