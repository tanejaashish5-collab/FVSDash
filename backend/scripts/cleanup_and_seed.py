"""
Sprint 8 Database Cleanup and Realistic Seeding Script
Wipes TEST_ data and seeds 3 realistic Hero Episodes for alex@company.com
"""
import asyncio
from datetime import datetime, timezone, timedelta
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Find alex@company.com's client ID
    user = await db.users.find_one({"email": "alex@company.com"})
    if not user:
        print("User alex@company.com not found!")
        return
    
    client_id = user.get("clientId", "demo-client-1")
    print(f"Working with client_id: {client_id}")
    
    # ========================================
    # PHASE 1: CLEANUP - Delete TEST_ and duplicate data
    # ========================================
    print("\n=== PHASE 1: CLEANUP ===")
    
    # Delete submissions with TEST_ in title
    test_subs = await db.submissions.delete_many({
        "clientId": client_id,
        "title": {"$regex": "^TEST_", "$options": "i"}
    })
    print(f"Deleted {test_subs.deleted_count} TEST_ submissions")
    
    # Delete duplicate Strategy Idea submissions
    dupe_subs = await db.submissions.delete_many({
        "clientId": client_id,
        "title": "TEST_Strategy_Idea_Submission"
    })
    print(f"Deleted {dupe_subs.deleted_count} duplicate Strategy Idea submissions")
    
    # Delete TEST_ assets
    test_assets = await db.assets.delete_many({
        "clientId": client_id,
        "$or": [
            {"title": {"$regex": "^TEST_", "$options": "i"}},
            {"title": {"$regex": "^test_", "$options": "i"}}
        ]
    })
    print(f"Deleted {test_assets.deleted_count} TEST_ assets")
    
    # Delete orphaned deliverables (linked to deleted submissions)
    existing_sub_ids = await db.submissions.distinct("id", {"clientId": client_id})
    orphan_deliverables = await db.deliverables.delete_many({
        "clientId": client_id,
        "submissionId": {"$nin": existing_sub_ids}
    })
    print(f"Deleted {orphan_deliverables.deleted_count} orphaned deliverables")
    
    # Delete orphaned assets
    orphan_assets = await db.assets.delete_many({
        "clientId": client_id,
        "submissionId": {"$nin": existing_sub_ids + [None]}
    })
    print(f"Deleted {orphan_assets.deleted_count} orphaned assets")
    
    # Clean up old publish jobs
    old_jobs = await db.publish_jobs.delete_many({
        "clientId": client_id,
        "status": {"$in": ["failed", "cancelled"]}
    })
    print(f"Deleted {old_jobs.deleted_count} old publish jobs")
    
    # Delete duplicate submissions with same title
    all_subs = await db.submissions.find({"clientId": client_id}).to_list(1000)
    seen_titles = {}
    ids_to_delete = []
    for sub in all_subs:
        title = sub.get("title", "")
        if title in seen_titles:
            ids_to_delete.append(sub["id"])
        else:
            seen_titles[title] = sub["id"]
    
    if ids_to_delete:
        dupe_del = await db.submissions.delete_many({"id": {"$in": ids_to_delete}})
        print(f"Deleted {dupe_del.deleted_count} duplicate title submissions")
    
    # ========================================
    # PHASE 2: SEED - Create 3 Hero Episodes
    # ========================================
    print("\n=== PHASE 2: SEED HERO EPISODES ===")
    
    now = datetime.now(timezone.utc)
    
    # Hero Episode 1: "In Production" - Script in Progress
    hero1_id = str(uuid.uuid4())
    hero1 = {
        "id": hero1_id,
        "clientId": client_id,
        "title": "The Chanakya Principle: Ancient Strategy for Modern Entrepreneurs",
        "guest": "Dr. Raghav Sharma",
        "description": "Discover how Chanakya's timeless principles of governance, economics, and strategy can transform your business approach. This episode explores the Arthashastra's wisdom on leadership, competition, and building sustainable empires.",
        "contentType": "Podcast",
        "status": "EDITING",
        "priority": "High",
        "releaseDate": (now + timedelta(days=5)).strftime("%Y-%m-%d"),
        "sourceFileUrl": "https://drive.google.com/chanakya-raw-audio",
        "tags": ["chanakya", "strategy", "entrepreneurship", "leadership", "ancient wisdom"],
        "createdAt": (now - timedelta(days=3)).isoformat(),
        "updatedAt": now.isoformat()
    }
    await db.submissions.insert_one(hero1)
    print(f"Created Hero Episode 1: {hero1['title']}")
    
    # Add deliverable for Hero 1 (script in progress)
    await db.deliverables.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "submissionId": hero1_id,
        "type": "script",
        "title": "Episode Script - Draft 1",
        "status": "in_progress",
        "releaseDate": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
        "createdAt": now.isoformat()
    })
    
    # Hero Episode 2: "Approved" - Ready to Publish (with video + thumbnail)
    hero2_id = str(uuid.uuid4())
    hero2_thumb_id = str(uuid.uuid4())
    hero2_video_id = str(uuid.uuid4())
    
    hero2 = {
        "id": hero2_id,
        "clientId": client_id,
        "title": "5 AI Tools Every Content Creator Needs in 2026",
        "guest": "",
        "description": "From script generation to video editing, discover the AI tools that will 10x your content output. We break down ElevenLabs, Runway, GPT-5, and more—showing you exactly how to use each for maximum impact.",
        "contentType": "Short",
        "status": "SCHEDULED",
        "priority": "High",
        "releaseDate": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
        "tags": ["AI tools", "content creation", "productivity", "YouTube Shorts", "automation"],
        "primaryThumbnailAssetId": hero2_thumb_id,
        "createdAt": (now - timedelta(days=5)).isoformat(),
        "updatedAt": now.isoformat()
    }
    await db.submissions.insert_one(hero2)
    print(f"Created Hero Episode 2: {hero2['title']}")
    
    # Add video asset for Hero 2
    await db.assets.insert_one({
        "id": hero2_video_id,
        "clientId": client_id,
        "submissionId": hero2_id,
        "type": "video",
        "title": "5 AI Tools - Final Cut",
        "url": "https://storage.example.com/ai-tools-video.mp4",
        "duration": 58,
        "status": "ready",
        "createdAt": (now - timedelta(hours=12)).isoformat()
    })
    
    # Add thumbnail for Hero 2
    await db.assets.insert_one({
        "id": hero2_thumb_id,
        "clientId": client_id,
        "submissionId": hero2_id,
        "type": "thumbnail",
        "title": "5 AI Tools - Thumbnail",
        "url": "https://storage.example.com/ai-tools-thumb.jpg",
        "isPrimaryThumbnail": True,
        "createdAt": (now - timedelta(hours=6)).isoformat()
    })
    
    # Add deliverables for Hero 2
    for dtype in ["script", "thumbnail", "video"]:
        await db.deliverables.insert_one({
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "submissionId": hero2_id,
            "type": dtype,
            "title": f"5 AI Tools - {dtype.title()}",
            "status": "complete",
            "releaseDate": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
            "createdAt": (now - timedelta(days=1)).isoformat()
        })
    
    # Hero Episode 3: "Published" - Live on YouTube with analytics
    hero3_id = str(uuid.uuid4())
    hero3_thumb_id = str(uuid.uuid4())
    
    hero3 = {
        "id": hero3_id,
        "clientId": client_id,
        "title": "Why 99% of Podcasters Fail (And How to Be Different)",
        "guest": "",
        "description": "The harsh truth about podcast success—and the counterintuitive strategy that separates viral shows from forgotten ones. Based on analysis of 10,000+ podcasts.",
        "contentType": "Short",
        "status": "PUBLISHED",
        "priority": "High",
        "releaseDate": (now - timedelta(days=7)).strftime("%Y-%m-%d"),
        "tags": ["podcast", "growth", "YouTube Shorts", "viral content", "creator economy"],
        "primaryThumbnailAssetId": hero3_thumb_id,
        "youtubeVideoId": "yt_demo_abc123",
        "youtubeUrl": "https://youtube.com/shorts/yt_demo_abc123",
        "publishedAt": (now - timedelta(days=7)).isoformat(),
        "publishingStatus": "published",
        "createdAt": (now - timedelta(days=14)).isoformat(),
        "updatedAt": (now - timedelta(days=7)).isoformat()
    }
    await db.submissions.insert_one(hero3)
    print(f"Created Hero Episode 3: {hero3['title']}")
    
    # Add assets for Hero 3
    await db.assets.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "submissionId": hero3_id,
        "type": "video",
        "title": "99% Fail - Final Video",
        "url": "https://youtube.com/shorts/yt_demo_abc123",
        "duration": 45,
        "status": "published",
        "youtubeVideoId": "yt_demo_abc123",
        "createdAt": (now - timedelta(days=8)).isoformat()
    })
    
    await db.assets.insert_one({
        "id": hero3_thumb_id,
        "clientId": client_id,
        "submissionId": hero3_id,
        "type": "thumbnail",
        "title": "99% Fail - Thumbnail",
        "url": "https://storage.example.com/99-fail-thumb.jpg",
        "isPrimaryThumbnail": True,
        "createdAt": (now - timedelta(days=8)).isoformat()
    })
    
    # Add publish job for Hero 3 (completed)
    await db.publish_jobs.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "submissionId": hero3_id,
        "platform": "youtube",
        "status": "live",
        "progress": 100,
        "title": hero3["title"],
        "platformVideoId": "yt_demo_abc123",
        "platformUrl": "https://youtube.com/shorts/yt_demo_abc123",
        "publishedAt": (now - timedelta(days=7)).isoformat(),
        "createdAt": (now - timedelta(days=7)).isoformat(),
        "updatedAt": (now - timedelta(days=7)).isoformat()
    })
    
    # Add realistic analytics snapshots for the last 30 days
    print("\n=== PHASE 3: SEED ANALYTICS DATA ===")
    
    # Delete old analytics
    await db.analytics_snapshots.delete_many({"clientId": client_id})
    
    import random
    base_views = 1200
    base_downloads = 350
    
    for i in range(30):
        day = now - timedelta(days=29-i)
        day_str = day.strftime("%Y-%m-%d")
        
        # Add some variance and weekend drops
        weekday = day.weekday()
        multiplier = 0.7 if weekday >= 5 else 1.0  # Weekend drop
        multiplier *= random.uniform(0.85, 1.15)  # Random variance
        
        # Trend upward over time
        growth = 1 + (i * 0.015)
        
        await db.analytics_snapshots.insert_one({
            "id": str(uuid.uuid4()),
            "clientId": client_id,
            "date": day_str,
            "views": int(base_views * multiplier * growth + random.randint(-50, 100)),
            "downloads": int(base_downloads * multiplier * growth + random.randint(-20, 40)),
            "watchTimeMinutes": int(450 * multiplier * growth + random.randint(-30, 50)),
            "subscribersGained": random.randint(5, 25),
            "ctr": round(4.5 + random.uniform(-0.5, 0.8), 2),
            "avgViewDuration": round(42 + random.uniform(-5, 8), 1),
            "roiEstimate": round(2500 * multiplier * growth + random.uniform(-200, 400), 2),
            "createdAt": day.isoformat()
        })
    
    print("Created 30 days of analytics data")
    
    # Final counts
    print("\n=== FINAL COUNTS ===")
    sub_count = await db.submissions.count_documents({"clientId": client_id})
    asset_count = await db.assets.count_documents({"clientId": client_id})
    deliv_count = await db.deliverables.count_documents({"clientId": client_id})
    analytics_count = await db.analytics_snapshots.count_documents({"clientId": client_id})
    
    print(f"Submissions: {sub_count}")
    print(f"Assets: {asset_count}")
    print(f"Deliverables: {deliv_count}")
    print(f"Analytics snapshots: {analytics_count}")
    
    client.close()
    print("\n✅ Cleanup and seeding complete!")

if __name__ == "__main__":
    asyncio.run(main())
