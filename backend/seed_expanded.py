"""Expanded seed script for ForgeVoice Studio demo data."""
import asyncio
import uuid
import random
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]

    # Drop all collections
    for coll in await db.list_collection_names():
        await db.drop_collection(coll)

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # ==================== USERS ====================
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@forgevoice.com",
        "passwordHash": pwd_context.hash("admin123"),
        "name": "ForgeVoice Admin",
        "role": "admin",
        "clientId": None,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    client_user = {
        "id": str(uuid.uuid4()),
        "email": "alex@company.com",
        "passwordHash": pwd_context.hash("client123"),
        "name": "Alex Chen",
        "role": "client",
        "clientId": "demo-client-1",
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    await db.users.insert_many([admin_user, client_user])

    # ==================== CLIENT ====================
    await db.clients.insert_one({
        "id": "demo-client-1",
        "name": "Alex Chen Media",
        "primaryContactName": "Alex Chen",
        "primaryContactEmail": "alex@company.com",
        "plan": "Pro",
        "createdAt": now_iso,
        "updatedAt": now_iso,
    })

    # ==================== SUBMISSIONS (10) ====================
    def ts(hours_ago):
        return (now - timedelta(hours=hours_ago)).isoformat()

    submissions = [
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "The Future of AI in Content Creation", "guest": "Dr. Sarah Mitchell", "description": "Deep dive into how AI tools are transforming podcast production workflows and audience engagement.", "contentType": "Podcast", "status": "PUBLISHED", "priority": "High", "releaseDate": "2025-12-15", "sourceFileUrl": None, "createdAt": ts(720), "updatedAt": ts(700)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Behind the Scenes: Studio Tour", "guest": "", "description": "A short video tour of our recording studio setup and equipment.", "contentType": "Short", "status": "PUBLISHED", "priority": "Low", "releaseDate": "2026-02-01", "sourceFileUrl": None, "createdAt": ts(360), "updatedAt": ts(340)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Building a Personal Brand Online", "guest": "Marcus Johnson", "description": "Strategies for growing your personal brand through podcasting and social presence.", "contentType": "Podcast", "status": "EDITING", "priority": "Medium", "releaseDate": "2026-02-25", "sourceFileUrl": None, "createdAt": ts(168), "updatedAt": ts(48)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Remote Recording Best Practices", "guest": "Nina Patel", "description": "How to get studio-quality audio recordings from a home office setup.", "contentType": "Podcast", "status": "EDITING", "priority": "High", "releaseDate": "2026-03-01", "sourceFileUrl": None, "createdAt": ts(120), "updatedAt": ts(24)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Quick Tips: Microphone Setup", "guest": "", "description": "Short form content on getting the best audio quality from your mic.", "contentType": "Short", "status": "DESIGN", "priority": "Low", "releaseDate": "2026-03-05", "sourceFileUrl": None, "createdAt": ts(96), "updatedAt": ts(12)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Content Calendar Planning Guide", "guest": "", "description": "A comprehensive blog post on planning and optimizing your content calendar.", "contentType": "Blog", "status": "DESIGN", "priority": "Medium", "releaseDate": "2026-03-08", "sourceFileUrl": None, "createdAt": ts(72), "updatedAt": ts(8)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Monetizing Your Content: A Webinar", "guest": "Lisa Park", "description": "Expert panel on content monetization strategies for independent creators.", "contentType": "Webinar", "status": "SCHEDULED", "priority": "High", "releaseDate": "2026-02-28", "sourceFileUrl": None, "createdAt": ts(48), "updatedAt": ts(6)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Social Media Clips Strategy", "guest": "", "description": "Short clips optimized for social media distribution and viral reach.", "contentType": "Short", "status": "SCHEDULED", "priority": "Medium", "releaseDate": "2026-03-15", "sourceFileUrl": None, "createdAt": ts(36), "updatedAt": ts(4)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "SEO for Podcasters", "guest": "", "description": "Written guide on optimizing podcast discoverability across platforms.", "contentType": "Blog", "status": "INTAKE", "priority": "Medium", "releaseDate": None, "sourceFileUrl": None, "createdAt": ts(12), "updatedAt": ts(2)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Interview with Tech CEO", "guest": "James Wright", "description": "In-depth conversation about emerging tech industry trends and AI.", "contentType": "Podcast", "status": "INTAKE", "priority": "High", "releaseDate": None, "sourceFileUrl": None, "createdAt": ts(4), "updatedAt": ts(1)},
    ]
    await db.submissions.insert_many(submissions)

    # ==================== ASSETS (8) ====================
    sub_ids = [s["id"] for s in submissions]
    assets = [
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "EP42 - Final Audio Mix", "type": "Audio", "url": "https://drive.google.com/file/ep42-mix", "status": "Final", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "EP42 - Cover Art", "type": "Thumbnail", "url": "https://drive.google.com/file/ep42-art", "status": "Final", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "EP42 - Full Transcript", "type": "Transcript", "url": "https://drive.google.com/file/ep42-tx", "status": "Final", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[1], "name": "Studio Tour - Raw Footage", "type": "Video", "url": "https://drive.google.com/file/tour-raw", "status": "Final", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[2], "name": "Brand Interview - Raw Audio", "type": "Audio", "url": "https://drive.google.com/file/brand-raw", "status": "Draft", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[3], "name": "Remote Recording - Raw", "type": "Audio", "url": "https://drive.google.com/file/remote-raw", "status": "Draft", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[4], "name": "Mic Setup - Thumbnail Draft", "type": "Thumbnail", "url": "https://drive.google.com/file/mic-thumb", "status": "Draft", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": None, "name": "Brand Kit - Logo Pack", "type": "Video", "url": "https://drive.google.com/file/brand-kit", "status": "Final", "createdAt": now_iso, "updatedAt": now_iso},
    ]
    await db.assets.insert_many(assets)

    # ==================== ANALYTICS (30 days) ====================
    analytics = []
    for i in range(30):
        d = now - timedelta(days=29 - i)
        analytics.append({
            "id": str(uuid.uuid4()),
            "clientId": "demo-client-1",
            "date": d.strftime("%Y-%m-%d"),
            "downloads": random.randint(80, 400),
            "views": random.randint(300, 2000),
            "subscribersGained": random.randint(8, 65),
            "episodesPublished": random.randint(0, 2),
            "roiEstimate": round(random.uniform(600, 3500), 2),
        })
    await db.analytics_snapshots.insert_many(analytics)

    # ==================== CLIENT SETTINGS ====================
    await db.client_settings.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "hourlyRate": 150,
        "competitorName": "PodcastPro Media",
        "brandVoiceDescription": "Professional yet approachable. Tech-forward with human warmth.",
        "airtableApiKey": None,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    })

    # ==================== BILLING ====================
    await db.billing_records.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "stripeCustomerId": None,
        "currentPlan": "Pro",
        "status": "Active",
        "nextBillingDate": "2026-03-01",
        "createdAt": now_iso,
        "updatedAt": now_iso,
    })

    # ==================== VIDEO TASKS (4) ====================
    await db.video_tasks.insert_many([
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "prompt": "Create a 30-second intro animation for podcast", "model": "veo-3", "status": "READY", "videoUrl": "https://example.com/video1.mp4", "createdAt": ts(200), "updatedAt": ts(180)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "prompt": "Generate audiogram visualization for Episode 42", "model": "veo-3", "status": "READY", "videoUrl": "https://example.com/video2.mp4", "createdAt": ts(100), "updatedAt": ts(90)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "prompt": "Create social media teaser clip with captions", "model": "veo-3", "status": "PROCESSING", "videoUrl": None, "createdAt": ts(20), "updatedAt": ts(18)},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "prompt": "Generate B-roll footage for studio tour", "model": "veo-3", "status": "FAILED", "videoUrl": None, "createdAt": ts(50), "updatedAt": ts(48)},
    ])

    # ==================== HELP ARTICLES ====================
    await db.help_articles.insert_many([
        {"id": str(uuid.uuid4()), "title": "Getting Started with ForgeVoice", "content": "Welcome to ForgeVoice Studio. This guide walks you through setting up your first project.", "category": "Getting Started", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "title": "Submitting Content", "content": "Learn how to submit your podcast episodes, shorts, and other content for production.", "category": "Submissions", "createdAt": now_iso, "updatedAt": now_iso},
        {"id": str(uuid.uuid4()), "title": "Understanding the Pipeline", "content": "How content moves through INTAKE, EDITING, DESIGN, SCHEDULED, and PUBLISHED stages.", "category": "Workflow", "createdAt": now_iso, "updatedAt": now_iso},
    ])

    # ==================== SUPPORT REQUESTS ====================
    await db.support_requests.insert_many([
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "userId": client_user["id"], "subject": "Need help with audio format", "message": "What audio formats do you accept for submissions?", "status": "Open", "createdAt": now_iso, "updatedAt": now_iso},
    ])

    # ==================== INDEXES ====================
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.clients.create_index("id", unique=True)

    print("Expanded seed complete! 10 submissions, 8 assets, 30 days analytics, 4 video tasks.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
