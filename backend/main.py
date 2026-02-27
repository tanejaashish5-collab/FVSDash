"""
ForgeVoice Studio API - Main Application Entry Point

This is the new modular FastAPI application structure.
All routes are organized into separate router modules in the /routers directory.
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import os
import logging

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
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Health check endpoint for Railway deployment."""
    return {"status": "ok", "service": "ForgeVoice Studio API"}


@app.on_event("startup")
async def startup():
    """Initialize database indexes and seed data on startup."""
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
    try:
        result = await run_seed()
        if result:
            logger.info("Demo data seeded successfully")
        
        # Run identity migration (Sprint 12)
        from migrations.versions.s12_identity_fix import run_identity_migration
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
