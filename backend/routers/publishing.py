"""Publishing routes for platform connections and publishing tasks."""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional, List
import uuid

from models.publishing import (
    PublishingTaskCreate, PublishingTaskUpdate, PlatformConnectionCreate,
    PlatformType, PublishingStatus
)
from services.auth_service import get_current_user, get_client_id_from_user
from db.mongo import publishing_tasks_collection, platform_connections_collection, submissions_collection, users_collection

router = APIRouter(tags=["publishing"])


# ============================================================================
# Platform Connections (Mock OAuth)
# ============================================================================

@router.get("/platform-connections")
async def list_platform_connections(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Get all platform connections for the current client."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = platform_connections_collection()
    
    connections = await db.find({"clientId": client_id}, {"_id": 0}).to_list(100)
    
    # Build response with all platforms, showing connected status
    platforms = [p.value for p in PlatformType]
    result = []
    
    for platform in platforms:
        conn = next((c for c in connections if c["platform"] == platform), None)
        if conn:
            result.append(conn)
        else:
            result.append({
                "id": None,
                "clientId": client_id,
                "platform": platform,
                "connected": False,
                "accountName": None,
                "accountHandle": None,
                "connectedAt": None
            })
    
    return result


@router.post("/platform-connections/{platform}/connect")
async def connect_platform(
    platform: PlatformType,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Mock OAuth connection for a platform.
    In production, this would redirect to OAuth flow and handle callback.
    For now, we simulate a successful connection with mock data.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = platform_connections_collection()
    
    # Check if already connected
    existing = await db.find_one({"clientId": client_id, "platform": platform.value}, {"_id": 0})
    if existing and existing.get("connected"):
        raise HTTPException(status_code=400, detail="Platform already connected")
    
    # Mock OAuth - create fake connection data
    mock_accounts = {
        "youtube_shorts": {"name": "Demo Channel", "handle": "@demo_yt_channel"},
        "tiktok": {"name": "Demo TikTok", "handle": "@demo_tiktok"},
        "instagram_reels": {"name": "Demo Instagram", "handle": "@demo_instagram"},
    }
    
    mock_data = mock_accounts.get(platform.value, {"name": "Demo Account", "handle": "@demo_account"})
    now = datetime.now(timezone.utc).isoformat()
    
    connection = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "platform": platform.value,
        "connected": True,
        "accountName": mock_data["name"],
        "accountHandle": mock_data["handle"],
        "accessToken": f"mock_token_{uuid.uuid4().hex[:16]}",  # Fake token
        "refreshToken": f"mock_refresh_{uuid.uuid4().hex[:16]}",  # Fake refresh token
        "tokenExpiry": None,  # Mock tokens don't expire
        "connectedAt": now,
        "updatedAt": now
    }
    
    if existing:
        await db.update_one(
            {"clientId": client_id, "platform": platform.value},
            {"$set": connection}
        )
    else:
        await db.insert_one(connection)
    
    # Return without sensitive token data
    return {
        "id": connection["id"],
        "clientId": client_id,
        "platform": platform.value,
        "connected": True,
        "accountName": connection["accountName"],
        "accountHandle": connection["accountHandle"],
        "connectedAt": connection["connectedAt"]
    }


@router.post("/platform-connections/{platform}/disconnect")
async def disconnect_platform(
    platform: PlatformType,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Disconnect a platform (remove OAuth tokens)."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = platform_connections_collection()
    
    result = await db.delete_one({"clientId": client_id, "platform": platform.value})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    return {"message": f"{platform.value} disconnected successfully"}


# ============================================================================
# Publishing Tasks CRUD
# ============================================================================

@router.post("/publishing-tasks")
async def create_publishing_task(
    data: PublishingTaskCreate,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Create a new publishing task for a submission."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    tasks_db = publishing_tasks_collection()
    subs_db = submissions_collection()
    conn_db = platform_connections_collection()
    
    # Verify submission exists and belongs to client
    submission = await subs_db.find_one(
        {"id": data.submissionId, "clientId": client_id},
        {"_id": 0, "id": 1, "title": 1}
    )
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check if platform is connected
    connection = await conn_db.find_one(
        {"clientId": client_id, "platform": data.platform.value, "connected": True},
        {"_id": 0}
    )
    if not connection:
        raise HTTPException(status_code=400, detail=f"Platform {data.platform.value} not connected. Connect in Settings first.")
    
    # Check for existing task for same submission+platform
    existing = await tasks_db.find_one(
        {"submissionId": data.submissionId, "platform": data.platform.value, "clientId": client_id},
        {"_id": 0}
    )
    if existing and existing.get("status") in ["scheduled", "posting", "posted"]:
        raise HTTPException(status_code=400, detail=f"Task already exists for this submission on {data.platform.value}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Determine initial status
    if data.scheduledAt:
        status = PublishingStatus.scheduled.value
    else:
        status = PublishingStatus.draft.value
    
    task = {
        "id": str(uuid.uuid4()),
        "clientId": client_id,
        "submissionId": data.submissionId,
        "submissionTitle": submission.get("title", "Untitled"),
        "platform": data.platform.value,
        "status": status,
        "scheduledAt": data.scheduledAt,
        "postedAt": None,
        "platformPostId": None,
        "errorMessage": None,
        "createdAt": now,
        "updatedAt": now
    }
    
    if existing:
        # Update existing draft/failed task
        await tasks_db.update_one(
            {"id": existing["id"]},
            {"$set": task}
        )
        task["id"] = existing["id"]
    else:
        await tasks_db.insert_one(task)
    
    # Remove _id if present
    task.pop("_id", None)
    return task


@router.get("/publishing-tasks")
async def list_publishing_tasks(
    submissionId: Optional[str] = Query(None),
    platform: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    clientId: Optional[str] = Query(None, description="Filter by client ID (admin only)"),
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    List publishing tasks with optional filters.
    
    For admin users:
    - If no clientId provided: returns ALL tasks across all clients with clientName
    - If clientId provided: filters to that specific client
    
    For client users:
    - Always returns only their own tasks (clientId param is ignored)
    """
    is_admin = user.get("role") == "admin"
    db = publishing_tasks_collection()
    users_db = users_collection()
    
    # Build query based on role
    if is_admin:
        if clientId:
            # Admin filtering by specific client
            query = {"clientId": clientId}
        else:
            # Admin sees all tasks
            query = {}
    else:
        # Client users always see only their own tasks
        query = {"clientId": get_client_id_from_user(user, impersonateClientId)}
    
    if submissionId:
        query["submissionId"] = submissionId
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status
    
    tasks = await db.find(query, {"_id": 0}).sort("createdAt", -1).to_list(500)
    
    # For admin users, enrich with client names
    if is_admin and tasks:
        # Get unique client IDs
        client_ids = list(set(t.get("clientId") for t in tasks if t.get("clientId")))
        
        # Fetch client names from users collection
        client_name_map = {}
        if client_ids:
            clients = await users_db.find(
                {"clientId": {"$in": client_ids}},
                {"_id": 0, "clientId": 1, "name": 1}
            ).to_list(500)
            client_name_map = {c["clientId"]: c.get("name", "Unknown Client") for c in clients}
        
        # Add clientName to each task
        for task in tasks:
            task["clientName"] = client_name_map.get(task.get("clientId"), "Unknown")
    
    return tasks


@router.get("/publishing-tasks/{task_id}")
async def get_publishing_task(
    task_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Get a single publishing task."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publishing_tasks_collection()
    
    task = await db.find_one({"id": task_id, "clientId": client_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Publishing task not found")
    
    return task


@router.patch("/publishing-tasks/{task_id}")
async def update_publishing_task(
    task_id: str,
    data: PublishingTaskUpdate,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Update a publishing task (status, scheduledAt, etc.)."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publishing_tasks_collection()
    
    task = await db.find_one({"id": task_id, "clientId": client_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Publishing task not found")
    
    update_fields = {"updatedAt": datetime.now(timezone.utc).isoformat()}
    
    if data.status is not None:
        update_fields["status"] = data.status.value
    if data.scheduledAt is not None:
        update_fields["scheduledAt"] = data.scheduledAt
    if data.errorMessage is not None:
        update_fields["errorMessage"] = data.errorMessage
    
    await db.update_one({"id": task_id}, {"$set": update_fields})
    
    updated = await db.find_one({"id": task_id}, {"_id": 0})
    return updated


@router.delete("/publishing-tasks/{task_id}")
async def delete_publishing_task(
    task_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Delete a publishing task."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publishing_tasks_collection()
    
    task = await db.find_one({"id": task_id, "clientId": client_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Publishing task not found")
    
    # Don't allow deleting tasks that are already posted
    if task.get("status") == "posted":
        raise HTTPException(status_code=400, detail="Cannot delete a posted task")
    
    await db.delete_one({"id": task_id})
    return {"message": "Publishing task deleted"}


@router.post("/publishing-tasks/{task_id}/post-now")
async def post_task_now(
    task_id: str,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Immediately post a task (mock execution).
    Sets status to 'posting', then simulates posting and sets to 'posted'.
    """
    client_id = get_client_id_from_user(user, impersonateClientId)
    db = publishing_tasks_collection()
    conn_db = platform_connections_collection()
    
    task = await db.find_one({"id": task_id, "clientId": client_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Publishing task not found")
    
    if task.get("status") == "posted":
        raise HTTPException(status_code=400, detail="Task already posted")
    
    # Verify platform is still connected
    connection = await conn_db.find_one(
        {"clientId": client_id, "platform": task["platform"], "connected": True},
        {"_id": 0}
    )
    if not connection:
        await db.update_one(
            {"id": task_id},
            {"$set": {"status": "failed", "errorMessage": "Platform disconnected", "updatedAt": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=400, detail="Platform not connected")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Mock posting - simulate success
    mock_post_id = f"mock_{task['platform']}_{uuid.uuid4().hex[:12]}"
    
    await db.update_one(
        {"id": task_id},
        {"$set": {
            "status": "posted",
            "postedAt": now,
            "platformPostId": mock_post_id,
            "errorMessage": None,
            "updatedAt": now
        }}
    )
    
    updated = await db.find_one({"id": task_id}, {"_id": 0})
    return updated


@router.post("/publishing-tasks/create-and-post")
async def create_and_post_task(
    data: PublishingTaskCreate,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Create a new publishing task and immediately post it.
    Convenience endpoint that combines create + post-now.
    """
    # First create the task
    task = await create_publishing_task(data, user, impersonateClientId)
    
    # Then post it immediately
    posted = await post_task_now(task["id"], user, impersonateClientId)
    return posted


# ============================================================================
# Publishing Stats
# ============================================================================

@router.get("/publishing-stats")
async def get_publishing_stats(
    clientId: Optional[str] = Query(None, description="Filter by client ID (admin only)"),
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """
    Get publishing statistics for the dashboard.
    
    For admin users:
    - If no clientId provided: returns stats for ALL tasks
    - If clientId provided: returns stats for that specific client
    
    For client users:
    - Always returns stats for own tasks only
    """
    is_admin = user.get("role") == "admin"
    db = publishing_tasks_collection()
    
    # Build query based on role
    if is_admin:
        if clientId:
            query = {"clientId": clientId}
        else:
            query = {}  # All tasks
    else:
        query = {"clientId": get_client_id_from_user(user, impersonateClientId)}
    
    tasks = await db.find(query, {"_id": 0, "status": 1}).to_list(1000)
    
    stats = {
        "total": len(tasks),
        "posted": sum(1 for t in tasks if t.get("status") == "posted"),
        "scheduled": sum(1 for t in tasks if t.get("status") == "scheduled"),
        "failed": sum(1 for t in tasks if t.get("status") == "failed"),
        "draft": sum(1 for t in tasks if t.get("status") == "draft"),
        "posting": sum(1 for t in tasks if t.get("status") == "posting"),
    }
    
    return stats
