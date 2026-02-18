"""
Seed data module for ForgeVoice Studio.
Creates a LIGHT demo dataset intended for performance and clarity.

Demo Dataset Summary:
- 2 users (admin + client)
- 1 demo client
- 5 submissions (various statuses)
- ~12 assets (linked to submissions)
- 45 days of analytics snapshots
- 2 video tasks (examples)
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


async def run_seed():
    """Seed the database with light demo data. Returns True if seeded, False if already exists."""
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

    # Create 5 submissions (one per status for pipeline visibility)
    submissions_db = submissions_collection()
    submissions = [
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "The Future of AI in Content Creation", "guest": "Dr. Sarah Mitchell", "description": "Deep dive into how AI tools are transforming podcast production", "contentType": "Podcast", "status": "PUBLISHED", "priority": "High", "releaseDate": "2026-02-10", "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Building a Personal Brand Online", "guest": "Marcus Johnson", "description": "Strategies for growing your personal brand through podcasting", "contentType": "Podcast", "status": "EDITING", "priority": "Medium", "releaseDate": "2026-02-25", "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Quick Tips: Microphone Setup", "guest": "", "description": "Short form content on getting the best audio quality", "contentType": "Short", "status": "DESIGN", "priority": "Low", "releaseDate": "2026-03-01", "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "Monetizing Your Content: A Webinar", "guest": "Lisa Park", "description": "Expert panel on content monetization strategies", "contentType": "Webinar", "status": "SCHEDULED", "priority": "High", "releaseDate": "2026-03-10", "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "title": "SEO for Podcasters Guide", "guest": "", "description": "Written guide on optimizing podcast discoverability", "contentType": "Blog", "status": "INTAKE", "priority": "Medium", "releaseDate": None, "sourceFileUrl": None, "createdAt": now, "updatedAt": now},
    ]
    await submissions_db.insert_many(submissions)

    # Create assets (2-3 per submission, lean set)
    assets_db = assets_collection()
    sub_ids = [s["id"] for s in submissions]
    assets = [
        # Published episode (complete set)
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "AI Content - Final Mix", "type": "Audio", "url": "https://drive.google.com/example1", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "AI Content - Thumbnail", "type": "Thumbnail", "url": "https://drive.google.com/example2", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[0], "name": "AI Content - Video", "type": "Video", "url": "https://drive.google.com/example3", "status": "Final", "createdAt": now, "updatedAt": now},
        # Editing episode (partial)
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[1], "name": "Personal Brand - Raw Audio", "type": "Audio", "url": "https://drive.google.com/example4", "status": "Draft", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[1], "name": "Personal Brand - Thumbnail v1", "type": "Thumbnail", "url": "https://drive.google.com/example5", "status": "Draft", "createdAt": now, "updatedAt": now},
        # Design episode
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[2], "name": "Mic Setup - Short Video", "type": "Video", "url": "https://drive.google.com/example6", "status": "Draft", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[2], "name": "Mic Tips - Thumbnail", "type": "Thumbnail", "url": "https://drive.google.com/example7", "status": "Draft", "createdAt": now, "updatedAt": now},
        # Scheduled webinar
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": sub_ids[3], "name": "Webinar - Promo Banner", "type": "Thumbnail", "url": "https://drive.google.com/example8", "status": "Final", "createdAt": now, "updatedAt": now},
        # Standalone brand assets
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": None, "name": "Podcast Intro Animation", "type": "Video", "url": "https://drive.google.com/example9", "status": "Final", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "submissionId": None, "name": "Channel Banner 2026", "type": "Thumbnail", "url": "https://drive.google.com/example10", "status": "Final", "createdAt": now, "updatedAt": now},
    ]
    await assets_db.insert_many(assets)

    # Create analytics snapshots (45 days - lean but enough for charts)
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

    # Create video tasks
    video_db = video_tasks_collection()
    await video_db.insert_many([
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "prompt": "Create a 30-second intro animation for podcast", "model": "veo-3", "status": "READY", "videoUrl": "https://example.com/video1.mp4", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "prompt": "Generate audiogram visualization", "model": "veo-3", "status": "PROCESSING", "videoUrl": None, "createdAt": now, "updatedAt": now},
    ])

    # Create help articles
    help_db = help_articles_collection()
    await help_db.insert_many([
        {"id": str(uuid.uuid4()), "title": "Getting Started with ForgeVoice", "content": "Welcome to ForgeVoice Studio! This guide walks you through setting up your first project.\n\n**Step 1: Create Your First Submission**\nNavigate to the Submissions page and click 'Submit New Content'. Fill in the episode details including title, guest information, and release date.\n\n**Step 2: Track Your Pipeline**\nUse the Overview dashboard to monitor your content through each production stage: Intake → Editing → Design → Scheduled → Published.\n\n**Step 3: Manage Assets**\nAll your deliverables (audio files, thumbnails, transcripts) appear in the Assets page once they're ready.", "category": "Getting Started", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Submitting Content for Production", "content": "Learn how to submit your podcast episodes, shorts, and other content for production.\n\n**Content Types Supported:**\n- Podcast episodes (full-length audio/video)\n- Shorts (clips under 60 seconds)\n- Blog posts (written content)\n- Webinars (live recordings)\n\n**Required Information:**\n- Episode title and description\n- Guest name and bio (if applicable)\n- Source file URL (Google Drive, Dropbox, etc.)\n- Target release date\n\nOnce submitted, your content enters the production pipeline and you'll receive updates at each stage.", "category": "Submissions", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "How Billing Works", "content": "Understanding your ForgeVoice subscription and billing.\n\n**Plans Available:**\n- **Starter ($99/mo)**: Up to 4 episodes, basic editing\n- **Pro ($299/mo)**: Up to 12 episodes, advanced features, analytics\n- **Enterprise ($799/mo)**: Unlimited episodes, dedicated support\n\n**Billing Cycle:**\nYou're billed monthly on the same date you signed up. You can upgrade or downgrade at any time.\n\n**Payment Methods:**\nWe accept all major credit cards through Stripe. Contact support to set up invoicing for Enterprise plans.", "category": "Billing", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Understanding Your ROI Dashboard", "content": "The ROI Center helps you understand the value your content generates.\n\n**How ROI is Calculated:**\n- Content Cost = Hours per Episode × Hourly Rate × Episodes\n- Estimated ROI is based on downloads, views, and subscriber growth\n- ROI Multiple = Total ROI ÷ Total Cost\n\n**Customizing Your Calculations:**\nGo to Settings to update your hourly rate and hours per episode to get accurate cost estimates.\n\n**What's a Good ROI?**\n- 1-2x: Breaking even\n- 2-5x: Good return\n- 5x+: Excellent performance", "category": "Analytics", "createdAt": now, "updatedAt": now},
        {"id": str(uuid.uuid4()), "title": "Setting Up Your Content Pipeline", "content": "Optimize your production workflow with these best practices.\n\n**Production Stages:**\n1. **Intake**: Content received and queued\n2. **Editing**: Audio/video editing in progress\n3. **Design**: Graphics, thumbnails, and branding\n4. **Scheduled**: Ready for release\n5. **Published**: Live and distributed\n\n**Tips for Success:**\n- Submit content at least 2 weeks before release\n- Provide clear guest bios and episode descriptions\n- Use the Calendar view to plan your release schedule", "category": "Getting Started", "createdAt": now, "updatedAt": now},
    ])

    # Create support requests
    support_db = support_requests_collection()
    await support_db.insert_many([
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "userEmail": "alex@company.com", "subject": "Need help with audio format", "message": "What audio formats do you accept for podcast submissions?", "status": "Resolved", "createdAt": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(), "updatedAt": now},
        {"id": str(uuid.uuid4()), "clientId": "demo-client-1", "userEmail": "alex@company.com", "subject": "Question about ROI calculations", "message": "How exactly is the ROI estimate calculated? I want to understand the methodology.", "status": "Open", "createdAt": now, "updatedAt": now},
    ])

    # Seed blog posts
    blog_db = blog_posts_collection()
    await blog_db.insert_many([
        {
            "id": str(uuid.uuid4()),
            "title": "How to Repurpose a Single Podcast Episode into 10+ Assets",
            "slug": "repurpose-podcast-into-10-assets",
            "excerpt": "Learn how to maximize your content ROI by transforming one podcast episode into social clips, blog posts, email content, and more.",
            "content": "Creating a podcast episode takes significant time and effort. But that single recording can become the foundation for an entire content ecosystem.\n\n## The Content Multiplication Framework\n\n**1. Full Episode (Primary Asset)**\nYour complete podcast episode on YouTube and audio platforms.\n\n**2. Short-Form Video Clips (3-5 per episode)**\nExtract the most engaging 30-60 second moments for TikTok, Reels, and Shorts.\n\n**3. Audiograms**\nVisual audio snippets perfect for LinkedIn and Twitter.\n\n**4. Blog Post**\nTranscribe and edit your episode into a comprehensive blog article.\n\n**5. Email Newsletter**\nSummarize key takeaways for your subscriber list.\n\n**6. Quote Graphics**\nPull memorable quotes and turn them into shareable images.\n\n**7. Thread/Carousel**\nBreak down the main points into a Twitter thread or Instagram carousel.\n\n**8. Transcript Download**\nOffer the full transcript as a lead magnet.\n\n**9. Show Notes**\nDetailed episode summary with timestamps and links.\n\n**10. Guest Promotion Pack**\nCreate assets your guest can share with their audience.\n\n## The ROI Impact\n\nBy repurposing systematically, you can achieve 10-20x more reach from the same production investment. At ForgeVoice, we've seen clients grow their audience 3x faster using this approach.",
            "tags": ["strategy", "content", "podcast"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Using AI to Speed Up Post-Production by 50%",
            "slug": "ai-speed-up-post-production",
            "excerpt": "Discover how AI tools are revolutionizing podcast editing, transcription, and content creation workflows.",
            "content": "Artificial intelligence is transforming how we produce content. Here's how to leverage AI tools to cut your post-production time in half.\n\n## AI-Powered Transcription\n\nModern AI transcription services achieve 95%+ accuracy, eliminating hours of manual work. Tools like Whisper and specialized podcast transcription services can process an hour of audio in minutes.\n\n## Automated Editing\n\n**Noise Reduction**: AI can identify and remove background noise, room echo, and audio artifacts automatically.\n\n**Filler Word Removal**: Smart editors can detect and remove 'ums', 'ahs', and awkward pauses.\n\n**Leveling**: AI balances audio levels between speakers automatically.\n\n## Content Generation\n\n**Show Notes**: AI can generate comprehensive show notes from your transcript.\n\n**Social Clips**: Algorithms identify the most engaging moments for short-form content.\n\n**Summaries**: Get episode summaries and key takeaways generated automatically.\n\n## The Human Touch\n\nWhile AI handles the heavy lifting, human creativity and judgment remain essential for:\n- Strategic content decisions\n- Brand voice consistency\n- Final quality review\n- Guest relationship management\n\n## Getting Started\n\nAt ForgeVoice, we combine AI efficiency with human expertise to deliver the best of both worlds. Our AI Video Lab lets you generate professional video content in minutes.",
            "tags": ["AI", "production", "technology"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "The Ultimate Podcast Launch Checklist for 2026",
            "slug": "podcast-launch-checklist-2026",
            "excerpt": "Everything you need to know to launch a successful podcast this year, from equipment to distribution strategy.",
            "content": "Launching a podcast in 2026 is easier than ever—but standing out requires strategy. Here's your complete checklist.\n\n## Pre-Launch (4-6 weeks before)\n\n- [ ] Define your niche and ideal listener\n- [ ] Choose your format (solo, interview, panel)\n- [ ] Select equipment (microphone, headphones, interface)\n- [ ] Design cover art and branding\n- [ ] Write your show description\n- [ ] Record 3-5 episodes before launch\n\n## Technical Setup\n\n- [ ] Choose a podcast host (Buzzsprout, Transistor, etc.)\n- [ ] Set up your RSS feed\n- [ ] Submit to Apple Podcasts, Spotify, and other directories\n- [ ] Create your website or landing page\n- [ ] Set up analytics tracking\n\n## Content Strategy\n\n- [ ] Plan your first 10 episode topics\n- [ ] Create a content calendar\n- [ ] Prepare episode templates (intro, outro, segments)\n- [ ] Set your release schedule\n\n## Launch Week\n\n- [ ] Release 3 episodes at once\n- [ ] Announce on all social platforms\n- [ ] Email your existing list\n- [ ] Ask guests to share\n- [ ] Submit to podcast directories you missed\n\n## Post-Launch\n\n- [ ] Respond to all reviews\n- [ ] Analyze first month metrics\n- [ ] Gather listener feedback\n- [ ] Plan your content repurposing strategy\n\n## Key Success Metrics\n\nTrack these KPIs from day one:\n- Downloads per episode\n- Completion rate\n- Subscriber growth\n- Reviews and ratings\n- Social engagement",
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
            "content": "Not all podcast metrics are created equal. Here's how to focus on what actually matters for growth.\n\n## Vanity Metrics vs. Value Metrics\n\n**Vanity Metrics** (nice to know):\n- Total downloads (all-time)\n- Social media followers\n- Number of episodes published\n\n**Value Metrics** (essential to track):\n- Downloads per episode (first 30 days)\n- Listener retention/completion rate\n- Subscriber conversion rate\n- Revenue per listener",
            "tags": ["analytics", "strategy", "growth"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=21)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
        {
            "id": str(uuid.uuid4()),
            "title": "5 Ways to Improve Your Podcast Audio Quality Today",
            "slug": "improve-podcast-audio-quality",
            "excerpt": "Simple, actionable tips to make your podcast sound professional without expensive equipment.",
            "content": "Great audio quality keeps listeners engaged. Here are five improvements you can make right now.\n\n## 1. Optimize Your Recording Space\n\n**The Problem**: Room echo and reverb make audio sound amateur.\n\n**The Fix**:\n- Record in a small, carpeted room\n- Hang blankets or curtains to absorb sound\n- Avoid rooms with hard, parallel surfaces\n- Position your mic away from walls\n\n## 2. Master Your Microphone Technique\n\n**The Problem**: Inconsistent volume and plosives.\n\n**The Fix**:\n- Keep 4-6 inches from the mic\n- Speak across the mic, not directly into it\n- Use a pop filter\n- Maintain consistent positioning throughout",
            "tags": ["production", "audio", "podcast"],
            "publishedAt": (datetime.now(timezone.utc) - timedelta(days=28)).isoformat(),
            "createdAt": now,
            "updatedAt": now
        },
    ])

    return True
