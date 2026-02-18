"""
Seed data module for ForgeVoice Studio.
Creates EXACTLY 5 COMPLETE demo episodes for end-to-end testing.

Demo Dataset Summary:
- 2 users (admin + client)
- 1 demo client
- 5 submissions (one per status for pipeline visibility)
- 15 assets (3 per episode: audio, video, thumbnail)
- 1 brand asset (standalone)
- 45 days of analytics snapshots
- 1 video task example
- 5 help articles
- 5 blog posts
- 2 support requests
"""
from datetime import datetime, timezone, timedelta
import uuid
import random

from db.mongo import (
    users_collection, clients_collection, submissions_collection,
    assets_collection, analytics_snapshots_collection, client_settings_collection,
    billing_records_collection, video_tasks_collection, help_articles_collection,
    support_requests_collection, blog_posts_collection
)
from services.auth_service import hash_password

# Demo episodes configuration - exactly 5 complete episodes
DEMO_EPISODES = [
    {
        "title": "The Future of AI in Content Creation",
        "guest": "Dr. Sarah Mitchell",
        "description": "Deep dive into how AI tools are transforming podcast production",
        "contentType": "Podcast",
        "status": "PUBLISHED",
        "priority": "High",
        "releaseDate": "2026-02-10",
    },
    {
        "title": "Building a Personal Brand Online",
        "guest": "Marcus Johnson",
        "description": "Strategies for growing your personal brand through podcasting",
        "contentType": "Podcast",
        "status": "EDITING",
        "priority": "Medium",
        "releaseDate": "2026-02-25",
    },
    {
        "title": "Quick Tips: Microphone Setup",
        "guest": "",
        "description": "Short form content on getting the best audio quality",
        "contentType": "Short",
        "status": "DESIGN",
        "priority": "Low",
        "releaseDate": "2026-03-01",
    },
    {
        "title": "Monetizing Your Content: A Webinar",
        "guest": "Lisa Park",
        "description": "Expert panel on content monetization strategies",
        "contentType": "Webinar",
        "status": "SCHEDULED",
        "priority": "High",
        "releaseDate": "2026-03-10",
    },
    {
        "title": "SEO for Podcasters Guide",
        "guest": "",
        "description": "Written guide on optimizing podcast discoverability",
        "contentType": "Blog",
        "status": "INTAKE",
        "priority": "Medium",
        "releaseDate": None,
    },
]

# Sample thumbnail URLs (placeholder images that actually work)
SAMPLE_THUMBNAILS = [
    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1280&h=720&fit=crop",  # Podcast studio
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1280&h=720&fit=crop",  # Business
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1280&h=720&fit=crop",  # Microphone
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1280&h=720&fit=crop",  # Webinar
    "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=1280&h=720&fit=crop",  # SEO/laptop
]

# Sample audio URLs (placeholder)
SAMPLE_AUDIO_URL = "https://storage.googleapis.com/fvs-mock/audio-placeholder.mp3"

# Sample video URLs (working Google samples)
SAMPLE_VIDEO_URLS = [
    "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
]


async def run_seed():
    """Seed the database with exactly 5 complete demo episodes."""
    users_db = users_collection()
    existing = await users_db.find_one({"email": "admin@forgevoice.com"}, {"_id": 0})
    if existing:
        return False

    now = datetime.now(timezone.utc).isoformat()

    # Create users
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@forgevoice.com",
        "passwordHash": hash_password("admin123"),
        "name": "ForgeVoice Admin",
        "role": "admin",
        "clientId": None,
        "createdAt": now,
        "updatedAt": now
    }
    client_user = {
        "id": str(uuid.uuid4()),
        "email": "alex@company.com",
        "passwordHash": hash_password("client123"),
        "name": "Alex Chen",
        "role": "client",
        "clientId": "demo-client-1",
        "createdAt": now,
        "updatedAt": now
    }
    await users_db.insert_many([admin_user, client_user])

    # Create client
    clients_db = clients_collection()
    demo_client = {
        "id": "demo-client-1",
        "name": "Alex Chen Media",
        "primaryContactName": "Alex Chen",
        "primaryContactEmail": "alex@company.com",
        "plan": "Pro",
        "createdAt": now,
        "updatedAt": now
    }
    await clients_db.insert_one(demo_client)

    # Create exactly 5 submissions with complete asset sets
    submissions_db = submissions_collection()
    assets_db = assets_collection()
    
    submissions = []
    assets = []
    
    for i, ep in enumerate(DEMO_EPISODES):
        sub_id = str(uuid.uuid4())
        short_title = ep["title"].split(":")[0] if ":" in ep["title"] else ep["title"][:20]
        
        # Create submission
        submissions.append({
            "id": sub_id,
            "clientId": "demo-client-1",
            "title": ep["title"],
            "guest": ep["guest"],
            "description": ep["description"],
            "contentType": ep["contentType"],
            "status": ep["status"],
            "priority": ep["priority"],
            "releaseDate": ep["releaseDate"],
            "sourceFileUrl": None,
            "createdAt": now,
            "updatedAt": now
        })
        
        # Create 3 assets per episode: Audio, Video, Thumbnail
        # Asset status matches submission progress
        asset_status = "Final" if ep["status"] in ["PUBLISHED", "SCHEDULED"] else "Draft"
        
        # Audio asset
        assets.append({
            "id": str(uuid.uuid4()),
            "clientId": "demo-client-1",
            "submissionId": sub_id,
            "name": f"{short_title} - Audio",
            "type": "Audio",
            "url": SAMPLE_AUDIO_URL,
            "status": asset_status,
            "fvsGenerated": False,
            "createdAt": now,
            "updatedAt": now
        })
        
        # Video asset
        assets.append({
            "id": str(uuid.uuid4()),
            "clientId": "demo-client-1",
            "submissionId": sub_id,
            "name": f"{short_title} - Video",
            "type": "Video",
            "url": SAMPLE_VIDEO_URLS[i % len(SAMPLE_VIDEO_URLS)],
            "status": asset_status,
            "fvsGenerated": False,
            "createdAt": now,
            "updatedAt": now
        })
        
        # Thumbnail asset
        assets.append({
            "id": str(uuid.uuid4()),
            "clientId": "demo-client-1",
            "submissionId": sub_id,
            "name": f"{short_title} - Thumbnail",
            "type": "Thumbnail",
            "url": SAMPLE_THUMBNAILS[i % len(SAMPLE_THUMBNAILS)],
            "status": asset_status,
            "fvsGenerated": False,
            "createdAt": now,
            "updatedAt": now
        })
    
    # Add one standalone brand asset
    assets.append({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "submissionId": None,
        "name": "Brand Kit - Channel Banner",
        "type": "Thumbnail",
        "url": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1280&h=720&fit=crop",
        "status": "Final",
        "fvsGenerated": False,
        "createdAt": now,
        "updatedAt": now
    })
    
    await submissions_db.insert_many(submissions)
    await assets_db.insert_many(assets)

    # Create analytics snapshots (45 days)
    analytics_db = analytics_snapshots_collection()
    analytics = []
    for i in range(45):
        d = datetime.now(timezone.utc) - timedelta(days=44 - i)
        base_downloads = 150 + (i * 3)
        base_views = 600 + (i * 8)
        weekend_boost = 1.3 if d.weekday() >= 5 else 1.0
        
        analytics.append({
            "id": str(uuid.uuid4()),
            "clientId": "demo-client-1",
            "date": d.strftime("%Y-%m-%d"),
            "downloads": int(random.randint(int(base_downloads * 0.8), int(base_downloads * 1.2)) * weekend_boost),
            "views": int(random.randint(int(base_views * 0.8), int(base_views * 1.2)) * weekend_boost),
            "subscribersGained": random.randint(10, 40),
            "episodesPublished": 1 if random.random() < 0.1 else 0,
            "roiEstimate": round(random.uniform(1200, 2800) * (1 + i/80), 2)
        })
    await analytics_db.insert_many(analytics)

    # Create client settings
    settings_db = client_settings_collection()
    await settings_db.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "hourlyRate": 150,
        "hoursPerEpisode": 5,
        "competitorName": "PodcastPro Media",
        "brandVoiceDescription": "Professional yet approachable. Tech-forward with human warmth. We speak to entrepreneurs and creators who value authenticity and actionable insights.",
        "airtableApiKey": None,
        "createdAt": now,
        "updatedAt": now
    })

    # Create billing record
    billing_db = billing_records_collection()
    await billing_db.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "stripeCustomerId": None,
        "currentPlan": "Pro",
        "status": "Active",
        "nextBillingDate": "2026-02-01",
        "createdAt": now,
        "updatedAt": now
    })

    # Create one video task example
    video_db = video_tasks_collection()
    await video_db.insert_one({
        "id": str(uuid.uuid4()),
        "clientId": "demo-client-1",
        "provider": "veo",
        "providerJobId": "demo-veo-001",
        "actualProvider": "mock_veo",
        "prompt": "Create intro animation for podcast channel",
        "mode": "script",
        "aspectRatio": "16:9",
        "outputProfile": "youtube_long",
        "status": "READY",
        "videoUrl": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "isMocked": True,
        "createdAt": now,
        "updatedAt": now
    })

    # Create help articles
    help_db = help_articles_collection()
    await help_db.insert_many([
        {"id": str(uuid.uuid4()), "title": "Getting Started with ForgeVoice", "content": "Welcome to ForgeVoice Studio! This guide walks you through setting up your first project.\n\n**Step 1: Create Your First Submission**\nNavigate to the Submissions page and click 'Submit New Content'. Fill in the episode details including title, guest information, and release date.\n\n**Step 2: Track Your Pipeline**\nUse the Overview dashboard to monitor your content through each production stage: Intake → Editing → Design → Scheduled → Published.\n\n**Step 3: Manage Assets**\nAll your deliverables (audio files, thumbnails, transcripts) appear in the Assets page once they're ready.", "category": "Getting Started", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Submitting Content for Production", "content": "Learn how to submit your podcast episodes, shorts, and other content for production.\n\n**Content Types Supported:**\n- Podcast episodes (full-length audio/video)\n- Shorts (clips under 60 seconds)\n- Blog posts (written content)\n- Webinars (live recordings)", "category": "Submissions", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "How Billing Works", "content": "Understanding your ForgeVoice subscription and billing.\n\n**Plans Available:**\n- **Starter ($99/mo)**: Up to 4 episodes, basic editing\n- **Pro ($299/mo)**: Up to 12 episodes, advanced features, analytics\n- **Enterprise ($799/mo)**: Unlimited episodes, dedicated support", "category": "Billing", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Understanding Your ROI Dashboard", "content": "The ROI Center helps you understand the value your content generates.\n\n**How ROI is Calculated:**\n- Content Cost = Hours per Episode × Hourly Rate × Episodes\n- Estimated ROI is based on downloads, views, and subscriber growth", "category": "Analytics", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Setting Up Your Content Pipeline", "content": "Optimize your production workflow with these best practices.\n\n**Production Stages:**\n1. **Intake**: Content received and queued\n2. **Editing**: Audio/video editing in progress\n3. **Design**: Graphics, thumbnails, and branding\n4. **Scheduled**: Ready for release\n5. **Published**: Live and distributed", "category": "Getting Started", "createdAt": now, "updatedAt": now},
    ])

    # Create support requests
    support_db = support_requests_collection()
    await support_db.insert_many([
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "userEmail": "alex@company.com", "subject": "Need help with audio format", "message": "What audio formats do you accept for podcast submissions?", "status": "Resolved", "createdAt": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(), "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "userEmail": "alex@company.com", "subject": "Question about ROI calculations", "message": "How exactly is the ROI estimate calculated?", "status": "Open", "createdAt": now, "updatedAt": now},
    ])

    # Seed blog posts
    blog_db = blog_posts_collection()
    await blog_db.insert_many([
        {
            "id": str(uuid.uuid4()),
            "title": "How to Repurpose a Single Podcast Episode into 10+ Assets",
            "slug": "repurpose-podcast-into-10-assets",
            "excerpt": "Learn how to maximize your content ROI by transforming one podcast episode into social clips, blog posts, and more.",
            "content": "Creating a podcast episode takes significant time and effort...",
            "tags": ["strategy", "content", "podcast"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Using AI to Speed Up Post-Production by 50%",
            "slug": "ai-speed-up-post-production",
            "excerpt": "Discover how AI tools are revolutionizing podcast editing.",
            "content": "Artificial intelligence is transforming how we produce content...",
            "tags": ["AI", "production", "technology"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "The Ultimate Podcast Launch Checklist for 2026",
            "slug": "podcast-launch-checklist-2026",
            "excerpt": "Everything you need to know to launch a successful podcast this year.",
            "content": "Launching a podcast in 2026 is easier than ever...",
            "tags": ["podcast", "strategy", "getting-started"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Understanding Podcast Analytics: Metrics That Actually Matter",
            "slug": "podcast-analytics-metrics-that-matter",
            "excerpt": "Cut through the noise and focus on the podcast metrics that drive real business growth.",
            "content": "Not all podcast metrics are created equal...",
            "tags": ["analytics", "strategy", "growth"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=21)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "5 Ways to Improve Your Podcast Audio Quality Today",
            "slug": "improve-podcast-audio-quality",
            "excerpt": "Simple, actionable tips to make your podcast sound professional.",
            "content": "Great audio quality keeps listeners engaged...",
            "tags": ["production", "audio", "podcast"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=28)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
    ])

    return True
