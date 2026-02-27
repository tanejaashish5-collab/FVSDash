"""
Sprint 13: Admin Data Cleanup Migration
Removes episode_ideas and fvs_recommendations for admin user (they have no channel)
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')


async def cleanup_admin_data():
    """
    Wipe all FVS-related data for admin account.
    Admin has no YouTube channel so this data is meaningless.
    """
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Find admin user
    admin = await db.users.find_one({"email": "admin@forgevoice.com"}, {"id": 1})
    if not admin:
        logger.warning("Admin user not found")
        return
    
    admin_id = admin.get("id")
    logger.info(f"Found admin user ID: {admin_id}")
    
    # Delete episode_ideas (fvs_ideas) for admin
    result1 = await db.fvs_ideas.delete_many({"clientId": admin_id})
    logger.info(f"Deleted {result1.deleted_count} fvs_ideas for admin")
    
    # Delete fvs_recommendations for admin
    result2 = await db.fvs_recommendations.delete_many({"clientId": admin_id})
    logger.info(f"Deleted {result2.deleted_count} fvs_recommendations for admin")
    
    # Delete brain_scores for admin
    result3 = await db.brain_scores.delete_many({"user_id": admin_id})
    logger.info(f"Deleted {result3.deleted_count} brain_scores for admin")
    
    # Delete fvs_brain_snapshots for admin
    result4 = await db.fvs_brain_snapshots.delete_many({"clientId": admin_id})
    logger.info(f"Deleted {result4.deleted_count} fvs_brain_snapshots for admin")
    
    # Delete fvs_activity for admin
    result5 = await db.fvs_activity.delete_many({"clientId": admin_id})
    logger.info(f"Deleted {result5.deleted_count} fvs_activity for admin")
    
    logger.info("Admin data cleanup complete!")
    client.close()


if __name__ == "__main__":
    asyncio.run(cleanup_admin_data())
