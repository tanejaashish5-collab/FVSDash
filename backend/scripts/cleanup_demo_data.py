#!/usr/bin/env python3
"""
Demo Data Cleanup Script for ForgeVoice Studio.

This script cleans up excess demo data to keep the app fast and uncluttered.
It preserves a small, curated dataset for each demo client.

USAGE (dev only):
    cd /app/backend && python scripts/cleanup_demo_data.py

WHAT IT KEEPS:
    - 4-5 most recent submissions per client
    - Assets linked to kept submissions + a few standalone assets
    - 2-3 most recent video tasks per provider
    - 5-10 most recent FVS ideas (mix of proposed/completed)
    - Recent FVS activity (last 10 entries)
    - Last 45 days of analytics snapshots
    - All users, clients, client settings
    - All blog posts and help articles

WHAT IT REMOVES:
    - Old submissions beyond the keep limit
    - Orphaned assets not linked to kept submissions
    - Old video tasks
    - Old FVS ideas and activity
    - Analytics older than 45 days
"""
import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from db.mongo import (
    submissions_collection, assets_collection, video_tasks_collection,
    fvs_ideas_collection, fvs_activity_collection, fvs_brain_snapshots_collection,
    fvs_scripts_collection, analytics_snapshots_collection
)

# Configuration - adjust these to control how much data to keep
KEEP_SUBMISSIONS = 5
KEEP_VIDEO_TASKS_PER_PROVIDER = 2
KEEP_FVS_IDEAS = 10
KEEP_FVS_ACTIVITY = 10
KEEP_ANALYTICS_DAYS = 45
DEMO_CLIENT_ID = "demo-client-1"


async def cleanup_submissions_and_assets():
    """Clean up excess submissions and their associated assets."""
    submissions_db = submissions_collection()
    assets_db = assets_collection()
    
    print("\n📝 Cleaning up Submissions and Assets...")
    
    # Get all submissions sorted by creation date (newest first)
    all_submissions = await submissions_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    
    print(f"   Found {len(all_submissions)} total submissions")
    
    if len(all_submissions) <= KEEP_SUBMISSIONS:
        print(f"   ✓ Already at or below limit ({KEEP_SUBMISSIONS}), skipping")
        kept_submission_ids = [s["id"] for s in all_submissions]
    else:
        # Keep the most recent submissions
        submissions_to_keep = all_submissions[:KEEP_SUBMISSIONS]
        submissions_to_delete = all_submissions[KEEP_SUBMISSIONS:]
        
        kept_submission_ids = [s["id"] for s in submissions_to_keep]
        delete_submission_ids = [s["id"] for s in submissions_to_delete]
        
        # Delete old submissions
        result = await submissions_db.delete_many({"id": {"$in": delete_submission_ids}})
        print(f"   ✓ Deleted {result.deleted_count} old submissions")
        
        # Delete assets linked to deleted submissions
        result = await assets_db.delete_many({
            "clientId": DEMO_CLIENT_ID,
            "submissionId": {"$in": delete_submission_ids}
        })
        print(f"   ✓ Deleted {result.deleted_count} assets from old submissions")
    
    # Get all assets for this client
    all_assets = await assets_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).to_list(1000)
    
    print(f"   Found {len(all_assets)} total assets remaining")
    
    # Keep assets that are linked to kept submissions OR are FVS-generated OR are standalone (no submissionId)
    # Delete excess standalone and orphaned assets
    orphaned_assets = [
        a for a in all_assets 
        if a.get("submissionId") and a["submissionId"] not in kept_submission_ids
    ]
    
    if orphaned_assets:
        orphan_ids = [a["id"] for a in orphaned_assets]
        result = await assets_db.delete_many({"id": {"$in": orphan_ids}})
        print(f"   ✓ Deleted {result.deleted_count} orphaned assets")
    
    # Count FVS-generated assets to keep (keep most recent 5)
    fvs_assets = await assets_db.find(
        {"clientId": DEMO_CLIENT_ID, "fvsGenerated": True},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    
    if len(fvs_assets) > 15:
        fvs_to_delete = fvs_assets[15:]
        fvs_delete_ids = [a["id"] for a in fvs_to_delete]
        result = await assets_db.delete_many({"id": {"$in": fvs_delete_ids}})
        print(f"   ✓ Deleted {result.deleted_count} old FVS-generated assets")


async def cleanup_video_tasks():
    """Clean up excess video tasks, keeping a few per provider."""
    video_db = video_tasks_collection()
    
    print("\n🎬 Cleaning up Video Tasks...")
    
    all_tasks = await video_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).to_list(1000)
    
    print(f"   Found {len(all_tasks)} total video tasks")
    
    # Group by provider
    providers = {}
    for task in all_tasks:
        provider = task.get("provider", "unknown")
        if provider not in providers:
            providers[provider] = []
        providers[provider].append(task)
    
    tasks_to_delete = []
    for provider, tasks in providers.items():
        # Sort by createdAt descending
        tasks.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        if len(tasks) > KEEP_VIDEO_TASKS_PER_PROVIDER:
            tasks_to_delete.extend([t["id"] for t in tasks[KEEP_VIDEO_TASKS_PER_PROVIDER:]])
            print(f"   Provider '{provider}': keeping {KEEP_VIDEO_TASKS_PER_PROVIDER}/{len(tasks)}")
        else:
            print(f"   Provider '{provider}': keeping all {len(tasks)}")
    
    if tasks_to_delete:
        result = await video_db.delete_many({"id": {"$in": tasks_to_delete}})
        print(f"   ✓ Deleted {result.deleted_count} old video tasks")
    else:
        print("   ✓ No video tasks to delete")


async def cleanup_fvs_data():
    """Clean up FVS ideas, activity, and snapshots."""
    ideas_db = fvs_ideas_collection()
    activity_db = fvs_activity_collection()
    snapshots_db = fvs_brain_snapshots_collection()
    scripts_db = fvs_scripts_collection()
    
    print("\n🧠 Cleaning up FVS System data...")
    
    # Clean FVS Ideas - keep mix of statuses
    all_ideas = await ideas_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    
    print(f"   Found {len(all_ideas)} FVS ideas")
    
    if len(all_ideas) > KEEP_FVS_IDEAS:
        # Keep some completed and some proposed
        completed = [i for i in all_ideas if i.get("status") == "completed"][:3]
        proposed = [i for i in all_ideas if i.get("status") == "proposed"][:5]
        other = [i for i in all_ideas if i.get("status") not in ["completed", "proposed"]][:2]
        
        keep_ids = set([i["id"] for i in completed + proposed + other])
        delete_ids = [i["id"] for i in all_ideas if i["id"] not in keep_ids]
        
        if delete_ids:
            result = await ideas_db.delete_many({"id": {"$in": delete_ids}})
            print(f"   ✓ Deleted {result.deleted_count} old FVS ideas")
    
    # Clean FVS Activity
    all_activity = await activity_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    
    print(f"   Found {len(all_activity)} FVS activity entries")
    
    if len(all_activity) > KEEP_FVS_ACTIVITY:
        activity_to_delete = all_activity[KEEP_FVS_ACTIVITY:]
        delete_ids = [a["id"] for a in activity_to_delete]
        result = await activity_db.delete_many({"id": {"$in": delete_ids}})
        print(f"   ✓ Deleted {result.deleted_count} old activity entries")
    
    # Clean FVS Brain Snapshots - keep only the most recent
    all_snapshots = await snapshots_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(100)
    
    if len(all_snapshots) > 2:
        delete_ids = [s["id"] for s in all_snapshots[2:]]
        result = await snapshots_db.delete_many({"id": {"$in": delete_ids}})
        print(f"   ✓ Deleted {result.deleted_count} old brain snapshots")
    
    # Clean FVS Scripts - keep only scripts linked to remaining ideas
    remaining_ideas = await ideas_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0, "id": 1}
    ).to_list(100)
    remaining_idea_ids = [i["id"] for i in remaining_ideas]
    
    result = await scripts_db.delete_many({
        "clientId": DEMO_CLIENT_ID,
        "fvsIdeaId": {"$nin": remaining_idea_ids}
    })
    if result.deleted_count:
        print(f"   ✓ Deleted {result.deleted_count} orphaned scripts")


async def cleanup_analytics():
    """Clean up old analytics snapshots."""
    analytics_db = analytics_snapshots_collection()
    
    print("\n📊 Cleaning up Analytics Snapshots...")
    
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=KEEP_ANALYTICS_DAYS)).strftime("%Y-%m-%d")
    
    # Count before
    total = await analytics_db.count_documents({"clientId": DEMO_CLIENT_ID})
    print(f"   Found {total} total analytics snapshots")
    
    # Delete old snapshots
    result = await analytics_db.delete_many({
        "clientId": DEMO_CLIENT_ID,
        "date": {"$lt": cutoff_date}
    })
    
    if result.deleted_count:
        print(f"   ✓ Deleted {result.deleted_count} snapshots older than {KEEP_ANALYTICS_DAYS} days")
    else:
        print(f"   ✓ No old snapshots to delete")


async def print_summary():
    """Print final data counts."""
    from db.mongo import (
        users_collection, clients_collection, blog_posts_collection,
        help_articles_collection, support_requests_collection
    )
    
    print("\n" + "="*50)
    print("📋 FINAL DATA SUMMARY")
    print("="*50)
    
    collections = [
        ("Users", users_collection()),
        ("Clients", clients_collection()),
        ("Submissions", submissions_collection()),
        ("Assets", assets_collection()),
        ("Video Tasks", video_tasks_collection()),
        ("FVS Ideas", fvs_ideas_collection()),
        ("FVS Activity", fvs_activity_collection()),
        ("Analytics", analytics_snapshots_collection()),
        ("Blog Posts", blog_posts_collection()),
        ("Help Articles", help_articles_collection()),
        ("Support Requests", support_requests_collection()),
    ]
    
    for name, coll in collections:
        count = await coll.count_documents({"clientId": DEMO_CLIENT_ID} if name not in ["Users", "Clients", "Blog Posts", "Help Articles"] else {})
        status = "✓" if count > 0 else "⚠"
        print(f"   {status} {name}: {count}")


async def main():
    """Run all cleanup operations."""
    print("="*50)
    print("🧹 ForgeVoice Studio - Demo Data Cleanup")
    print("="*50)
    print(f"   Target client: {DEMO_CLIENT_ID}")
    print(f"   Keep submissions: {KEEP_SUBMISSIONS}")
    print(f"   Keep video tasks per provider: {KEEP_VIDEO_TASKS_PER_PROVIDER}")
    print(f"   Keep FVS ideas: {KEEP_FVS_IDEAS}")
    print(f"   Keep analytics days: {KEEP_ANALYTICS_DAYS}")
    
    await cleanup_submissions_and_assets()
    await cleanup_video_tasks()
    await cleanup_fvs_data()
    await cleanup_analytics()
    await print_summary()
    
    print("\n✅ Cleanup complete!")
    print("   Restart the backend if needed: sudo supervisorctl restart backend")


if __name__ == "__main__":
    asyncio.run(main())
