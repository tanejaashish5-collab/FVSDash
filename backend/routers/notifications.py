"""Notification routes for real-time status feed."""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import List
import uuid

from models.notification import (
    NotificationCreate, NotificationResponse, UnreadCountResponse,
    NotificationType, NotificationPriority
)
from services.auth_service import get_current_user
from db.mongo import notifications_collection

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(user: dict = Depends(get_current_user)):
    """
    Get the 20 most recent notifications for the current user.
    """
    db = notifications_collection()
    
    notifications = await db.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return notifications


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(user: dict = Depends(get_current_user)):
    """
    Get the count of unread notifications for the current user.
    """
    db = notifications_collection()
    
    count = await db.count_documents({
        "user_id": user["id"],
        "is_read": False
    })
    
    return {"count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(notification_id: str, user: dict = Depends(get_current_user)):
    """
    Mark a single notification as read.
    """
    db = notifications_collection()
    
    # Check notification exists and belongs to user
    notification = await db.find_one(
        {"id": notification_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Mark as read
    await db.update_one(
        {"id": notification_id},
        {"$set": {"is_read": True}}
    )
    
    notification["is_read"] = True
    return notification


@router.post("/read-all")
async def mark_all_as_read(user: dict = Depends(get_current_user)):
    """
    Mark all unread notifications as read for the current user.
    """
    db = notifications_collection()
    
    result = await db.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"message": f"Marked {result.modified_count} notifications as read"}


# ============================================================================
# Helper function to create notifications (used by other services)
# ============================================================================

async def create_notification(
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    link: str = None,
    priority: NotificationPriority = NotificationPriority.MEDIUM
) -> dict:
    """
    Create a new notification for a user.
    Called by other services when events occur.
    """
    db = notifications_collection()
    
    notification_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    notification_doc = {
        "id": notification_id,
        "user_id": user_id,
        "type": notification_type.value,
        "title": title,
        "message": message,
        "link": link,
        "is_read": False,
        "priority": priority.value,
        "created_at": now
    }
    
    await db.insert_one(notification_doc)
    notification_doc.pop("_id", None)
    
    return notification_doc
