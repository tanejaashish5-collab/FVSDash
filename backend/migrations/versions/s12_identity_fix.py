"""
Sprint 12: Identity Fix Migration
Renames the demo client from Alex Chen to Chanakya Sutra.
"""
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


async def run_identity_migration(db):
    """
    One-time migration to rename the demo client from Alex Chen to Chanakya Sutra.
    - Updates user record: full_name -> "Chanakya Sutra"
    - Updates client record: name -> "Chanakya Sutra"
    """
    try:
        # Update user record
        user_result = await db.users.update_one(
            {"email": "alex@company.com"},
            {
                "$set": {
                    "name": "Chanakya Sutra",
                    "full_name": "Chanakya Sutra",
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Update client record
        client_result = await db.clients.update_one(
            {"id": "demo-client-1"},
            {
                "$set": {
                    "name": "Chanakya Sutra",
                    "primaryContactName": "Chanakya Sutra",
                    "updatedAt": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        if user_result.modified_count > 0 or client_result.modified_count > 0:
            logger.info("Identity migration complete: Alex Chen -> Chanakya Sutra")
            return True
        else:
            # Already migrated or user doesn't exist
            return False
            
    except Exception as e:
        logger.error(f"Identity migration failed: {e}")
        return False
