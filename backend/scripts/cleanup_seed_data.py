"""
Cleanup script to remove all seed/dummy data from MongoDB.
Preserves real data like chanakya-sutra client and published YouTube content.

Run with: python -m scripts.cleanup_seed_data
"""
import asyncio
from db.mongo import (
    users_collection, clients_collection, submissions_collection,
    assets_collection, analytics_snapshots_collection, client_settings_collection,
    billing_records_collection, video_tasks_collection, help_articles_collection,
    support_requests_collection, blog_posts_collection, fvs_ideas_collection,
    fvs_brain_snapshots_collection, fvs_activity_collection
)


async def cleanup_seed_data():
    """Remove all seed data while preserving real production data."""

    print("🧹 Starting cleanup of seed data...")

    # 1. Remove demo users
    users_db = users_collection()
    demo_emails = ["admin@forgevoice.com", "alex@company.com"]
    result = await users_db.delete_many({"email": {"$in": demo_emails}})
    print(f"✓ Removed {result.deleted_count} demo users")

    # 2. Remove demo client (but keep chanakya-sutra)
    clients_db = clients_collection()
    result = await clients_db.delete_many({"id": "demo-client-1"})
    print(f"✓ Removed {result.deleted_count} demo clients")

    # 3. Remove demo submissions (keep chanakya-sutra submissions and Published YouTube content)
    submissions_db = submissions_collection()
    result = await submissions_db.delete_many({
        "clientId": "demo-client-1"
    })
    print(f"✓ Removed {result.deleted_count} demo submissions")

    # 4. Remove demo assets
    assets_db = assets_collection()
    result = await assets_db.delete_many({
        "clientId": "demo-client-1"
    })
    print(f"✓ Removed {result.deleted_count} demo assets")

    # 5. Remove demo analytics snapshots
    analytics_db = analytics_snapshots_collection()
    result = await analytics_db.delete_many({
        "clientId": "demo-client-1"
    })
    print(f"✓ Removed {result.deleted_count} demo analytics snapshots")

    # 6. Remove demo help articles (all are seed data)
    help_db = help_articles_collection()
    result = await help_db.delete_many({})
    print(f"✓ Removed {result.deleted_count} help articles")

    # 7. Remove demo blog posts (all are seed data)
    blog_db = blog_posts_collection()
    result = await blog_db.delete_many({})
    print(f"✓ Removed {result.deleted_count} blog posts")

    # 8. Remove demo support requests
    support_db = support_requests_collection()
    result = await support_db.delete_many({
        "clientId": "demo-client-1"
    })
    print(f"✓ Removed {result.deleted_count} support requests")

    # 9. Remove demo video tasks
    video_tasks_db = video_tasks_collection()
    result = await video_tasks_db.delete_many({
        "clientId": "demo-client-1"
    })
    print(f"✓ Removed {result.deleted_count} video tasks")

    # 10. Remove demo FVS ideas (keep chanakya-sutra ideas)
    ideas_db = fvs_ideas_collection()
    result = await ideas_db.delete_many({
        "clientId": "demo-client-1"
    })
    print(f"✓ Removed {result.deleted_count} FVS ideas")

    # 11. Remove demo FVS brain snapshots
    brain_db = fvs_brain_snapshots_collection()
    result = await brain_db.delete_many({
        "clientId": "demo-client-1"
    })
    print(f"✓ Removed {result.deleted_count} brain snapshots")

    # 12. Remove demo FVS activity
    activity_db = fvs_activity_collection()
    result = await activity_db.delete_many({
        "clientId": "demo-client-1"
    })
    print(f"✓ Removed {result.deleted_count} activity logs")

    print("\n✅ Cleanup complete! Dashboard is now clean slate.")
    print("📌 Preserved: chanakya-sutra client, Published YouTube content, real automation data")


if __name__ == "__main__":
    asyncio.run(cleanup_seed_data())
