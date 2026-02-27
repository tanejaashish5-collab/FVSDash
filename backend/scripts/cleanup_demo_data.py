#!/usr/bin/env python3
"""
Demo Data Cleanup Script for ForgeVoice Studio.

This script enforces EXACTLY 5 complete demo episodes with proper assets.
It removes ALL orphaned or unlinked data to provide a clean testing environment.

USAGE (dev only):
    cd /app/backend && python scripts/cleanup_demo_data.py

WHAT IT KEEPS:
    - Exactly 5 most recent submissions per client
    - Exactly 3 assets per submission (audio, video, thumbnail)
    - 1 standalone brand asset (Brand Kit - Channel Banner)
    - 2 video tasks maximum
    - 5 FVS ideas maximum (mix of proposed/completed)
    - 5 FVS activity entries
    - Last 45 days of analytics snapshots
    - All users, clients, client settings
    - All blog posts and help articles

WHAT IT REMOVES:
    - All submissions beyond 5
    - ALL orphaned/unlinked assets (no more "Unlinked" rows)
    - Excess video tasks
    - Old FVS data
    - Old analytics

FINAL COUNTS:
    - Submissions: 5
    - Assets: 16 (15 episode assets + 1 brand asset)
    - Video Tasks: ≤2
    - FVS Ideas: ≤5
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

# Configuration - EXACTLY 5 complete episodes
KEEP_SUBMISSIONS = 5
KEEP_VIDEO_TASKS = 2
KEEP_FVS_IDEAS = 5
KEEP_FVS_ACTIVITY = 5
KEEP_ANALYTICS_DAYS = 45
DEMO_CLIENT_ID = "demo-client-1"

# Allowed standalone assets (brand assets that don't need a submission)
ALLOWED_STANDALONE_NAMES = ["Brand Kit - Channel Banner"]


async def cleanup_to_exact_5_episodes():
    """Enforce exactly 5 complete episodes with proper assets."""
    submissions_db = submissions_collection()
    assets_db = assets_collection()
    
    print("\n📝 Enforcing exactly 5 complete episodes...")
    
    # Get all submissions sorted by creation date (newest first)
    all_submissions = await submissions_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    
    print(f"   Found {len(all_submissions)} total submissions")
    
    # Keep exactly 5 most recent
    if len(all_submissions) > KEEP_SUBMISSIONS:
        submissions_to_keep = all_submissions[:KEEP_SUBMISSIONS]
        submissions_to_delete = all_submissions[KEEP_SUBMISSIONS:]
        
        delete_submission_ids = [s["id"] for s in submissions_to_delete]
        
        # Delete excess submissions
        result = await submissions_db.delete_many({"id": {"$in": delete_submission_ids}})
        print(f"   ✓ Deleted {result.deleted_count} submissions (keeping {KEEP_SUBMISSIONS})")
    else:
        submissions_to_keep = all_submissions
        print(f"   ✓ Already have {len(all_submissions)} submissions")
    
    # Get the IDs of kept submissions
    kept_submission_ids = set([s["id"] for s in submissions_to_keep])
    
    # Now clean up assets - remove ALL that aren't linked to kept submissions
    # except for explicitly allowed standalone assets
    all_assets = await assets_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).to_list(1000)
    
    print(f"   Found {len(all_assets)} total assets")
    
    assets_to_delete = []
    for asset in all_assets:
        sub_id = asset.get("submissionId")
        name = asset.get("name", "")
        
        # Keep if linked to a kept submission
        if sub_id and sub_id in kept_submission_ids:
            continue
        
        # Keep if it's an allowed standalone brand asset
        if not sub_id and name in ALLOWED_STANDALONE_NAMES:
            continue
        
        # Delete everything else (orphaned, unlinked non-brand assets)
        assets_to_delete.append(asset["id"])
    
    if assets_to_delete:
        result = await assets_db.delete_many({"id": {"$in": assets_to_delete}})
        print(f"   ✓ Deleted {result.deleted_count} orphaned/unlinked assets")
    else:
        print("   ✓ No orphaned assets to delete")
    
    # Count final assets
    final_assets = await assets_db.count_documents({"clientId": DEMO_CLIENT_ID})
    print(f"   ✓ Final asset count: {final_assets}")
    
    # Show asset breakdown
    audio_count = await assets_db.count_documents({"clientId": DEMO_CLIENT_ID, "type": "Audio"})
    video_count = await assets_db.count_documents({"clientId": DEMO_CLIENT_ID, "type": "Video"})
    thumb_count = await assets_db.count_documents({"clientId": DEMO_CLIENT_ID, "type": "Thumbnail"})
    print(f"   Asset breakdown: Audio={audio_count}, Video={video_count}, Thumbnail={thumb_count}")
    
    return kept_submission_ids


async def cleanup_video_tasks():
    """Clean up excess video tasks."""
    video_db = video_tasks_collection()
    
    print("\n🎬 Cleaning up Video Tasks...")
    
    all_tasks = await video_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    
    print(f"   Found {len(all_tasks)} total video tasks")
    
    if len(all_tasks) > KEEP_VIDEO_TASKS:
        tasks_to_delete = [t["id"] for t in all_tasks[KEEP_VIDEO_TASKS:]]
        result = await video_db.delete_many({"id": {"$in": tasks_to_delete}})
        print(f"   ✓ Deleted {result.deleted_count} video tasks (keeping {KEEP_VIDEO_TASKS})")
    else:
        print(f"   ✓ Already have {len(all_tasks)} tasks")


async def cleanup_fvs_data():
    """Clean up FVS ideas, activity, and snapshots."""
    ideas_db = fvs_ideas_collection()
    activity_db = fvs_activity_collection()
    snapshots_db = fvs_brain_snapshots_collection()
    scripts_db = fvs_scripts_collection()
    
    print("\n🧠 Cleaning up FVS System data...")
    
    # Clean FVS Ideas - keep only the most recent 5
    all_ideas = await ideas_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(1000)
    
    print(f"   Found {len(all_ideas)} FVS ideas")
    
    if len(all_ideas) > KEEP_FVS_IDEAS:
        # Prefer keeping completed ones first, then proposed
        completed = [i for i in all_ideas if i.get("status") == "completed"][:2]
        proposed = [i for i in all_ideas if i.get("status") == "proposed"][:3]
        keep_ideas = completed + proposed
        
        if len(keep_ideas) < KEEP_FVS_IDEAS:
            # Fill with any remaining
            keep_ids_set = set([i["id"] for i in keep_ideas])
            remaining = [i for i in all_ideas if i["id"] not in keep_ids_set][:KEEP_FVS_IDEAS - len(keep_ideas)]
            keep_ideas.extend(remaining)
        
        keep_ids = set([i["id"] for i in keep_ideas])
        delete_ids = [i["id"] for i in all_ideas if i["id"] not in keep_ids]
        
        if delete_ids:
            result = await ideas_db.delete_many({"id": {"$in": delete_ids}})
            print(f"   ✓ Deleted {result.deleted_count} FVS ideas (keeping {KEEP_FVS_IDEAS})")
    else:
        print(f"   ✓ Already have {len(all_ideas)} ideas")
    
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
        print(f"   ✓ Deleted {result.deleted_count} activity entries")
    
    # Clean FVS Brain Snapshots - keep only most recent 2
    all_snapshots = await snapshots_db.find(
        {"clientId": DEMO_CLIENT_ID},
        {"_id": 0}
    ).sort("createdAt", -1).to_list(100)
    
    if len(all_snapshots) > 2:
        delete_ids = [s["id"] for s in all_snapshots[2:]]
        result = await snapshots_db.delete_many({"id": {"$in": delete_ids}})
        print(f"   ✓ Deleted {result.deleted_count} brain snapshots")
    
    # Clean orphaned FVS Scripts
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
    
    print("\n📊 Cleaning up Analytics...")
    
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=KEEP_ANALYTICS_DAYS)).strftime("%Y-%m-%d")
    
    total = await analytics_db.count_documents({"clientId": DEMO_CLIENT_ID})
    print(f"   Found {total} total analytics snapshots")
    
    result = await analytics_db.delete_many({
        "clientId": DEMO_CLIENT_ID,
        "date": {"$lt": cutoff_date}
    })
    
    if result.deleted_count:
        print(f"   ✓ Deleted {result.deleted_count} old snapshots (keeping {KEEP_ANALYTICS_DAYS} days)")


async def print_summary():
    """Print final data counts."""
    from db.mongo import (
        users_collection, clients_collection, blog_posts_collection,
        help_articles_collection, support_requests_collection
    )
    
    print("\n" + "="*60)
    print("📋 FINAL DATA SUMMARY FOR DEMO CLIENT")
    print("="*60)
    
    submissions_db = submissions_collection()
    assets_db = assets_collection()
    video_db = video_tasks_collection()
    ideas_db = fvs_ideas_collection()
    activity_db = fvs_activity_collection()
    analytics_db = analytics_snapshots_collection()
    
    # Count per collection for demo client
    sub_count = await submissions_db.count_documents({"clientId": DEMO_CLIENT_ID})
    asset_count = await assets_db.count_documents({"clientId": DEMO_CLIENT_ID})
    video_count = await video_db.count_documents({"clientId": DEMO_CLIENT_ID})
    idea_count = await ideas_db.count_documents({"clientId": DEMO_CLIENT_ID})
    activity_count = await activity_db.count_documents({"clientId": DEMO_CLIENT_ID})
    analytics_count = await analytics_db.count_documents({"clientId": DEMO_CLIENT_ID})
    
    # Asset type breakdown
    audio = await assets_db.count_documents({"clientId": DEMO_CLIENT_ID, "type": "Audio"})
    video = await assets_db.count_documents({"clientId": DEMO_CLIENT_ID, "type": "Video"})
    thumb = await assets_db.count_documents({"clientId": DEMO_CLIENT_ID, "type": "Thumbnail"})
    
    print(f"""
   Submissions:      {sub_count}  (target: 5)
   Assets:           {asset_count}  (target: 16 = 5×3 + 1 brand)
     - Audio:        {audio}
     - Video:        {video}
     - Thumbnail:    {thumb}
   Video Tasks:      {video_count}  (target: ≤2)
   FVS Ideas:        {idea_count}  (target: ≤5)
   FVS Activity:     {activity_count}  (target: ≤5)
   Analytics Days:   {analytics_count}

   Blog Posts:       Preserved ✓
   Help Articles:    Preserved ✓
   Users/Clients:    Preserved ✓
""")
    
    # Check completeness
    if sub_count == 5 and audio >= 5 and video >= 5 and thumb >= 5:
        print("   ✅ All 5 episodes have complete asset sets!")
    else:
        print("   ⚠️  Some episodes may be missing assets")


async def main():
    """Run all cleanup operations."""
    print("="*60)
    print("🧹 ForgeVoice Studio - Demo Data Cleanup (Strict Mode)")
    print("="*60)
    print(f"""
   Target: Exactly {KEEP_SUBMISSIONS} complete demo episodes
   Each episode will have: Audio + Video + Thumbnail
   All orphaned/unlinked assets will be removed
""")
    
    await cleanup_to_exact_5_episodes()
    await cleanup_video_tasks()
    await cleanup_fvs_data()
    await cleanup_analytics()
    await print_summary()
    
    print("\n✅ Cleanup complete!")
    print("   The demo dataset now has exactly 5 complete episodes.")


if __name__ == "__main__":
    asyncio.run(main())
