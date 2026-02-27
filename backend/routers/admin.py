"""Admin routes - client management and impersonation."""
from fastapi import APIRouter, Depends, HTTPException

from models.admin import (
    ImpersonateRequest, ImpersonateResponse, ClientMetrics, ClientSummary,
    CreateClientRequest, CreateClientResponse, UpdateClientRequest
)
from services.auth_service import require_admin
from services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/clients", response_model=list[ClientMetrics])
async def get_all_clients(user: dict = Depends(require_admin)):
    """
    Get all clients with their key metrics.
    Admin only endpoint.
    Includes: channel_name, subscriber_count, total_videos, youtube_connected, is_active
    """
    return await admin_service.get_all_clients_with_metrics()


@router.post("/clients", response_model=CreateClientResponse)
async def create_client(data: CreateClientRequest, user: dict = Depends(require_admin)):
    """
    Create a new client account with channel profile.
    Admin only endpoint.
    Creates: User record (role=client) + ChannelProfile record
    """
    return await admin_service.create_client(data)


@router.get("/clients/{client_id}/summary", response_model=ClientSummary)
async def get_client_summary(client_id: str, user: dict = Depends(require_admin)):
    """
    Get detailed summary for a specific client.
    Admin only endpoint.
    """
    return await admin_service.get_client_summary(client_id)


@router.patch("/clients/{client_id}")
async def update_client(
    client_id: str, 
    data: UpdateClientRequest, 
    user: dict = Depends(require_admin)
):
    """
    Update client details (full_name, email, channel_description, niche).
    Admin only endpoint.
    """
    return await admin_service.update_client(client_id, data)


@router.delete("/clients/{client_id}")
async def deactivate_client(client_id: str, user: dict = Depends(require_admin)):
    """
    Soft delete / deactivate a client (sets is_active=false).
    Admin only endpoint. Does not hard delete - preserves data.
    """
    return await admin_service.deactivate_client(client_id)


@router.post("/impersonate", response_model=ImpersonateResponse)
async def impersonate_client(data: ImpersonateRequest, user: dict = Depends(require_admin)):
    """
    Validate client for impersonation and return client info.
    Admin only endpoint. Does not change server-side session.
    """
    return await admin_service.validate_impersonation(data.clientId)


@router.post("/migrate-assets")
async def migrate_local_assets_to_s3(user: dict = Depends(require_admin)):
    """
    Migrate local assets to S3 storage.
    Admin only endpoint. Only runs if S3 is configured.
    """
    from services.storage_service import (
        get_storage_service, is_storage_configured, check_local_assets_need_migration
    )
    from db.mongo import assets_collection
    import aiofiles
    from pathlib import Path
    
    if not is_storage_configured():
        raise HTTPException(
            status_code=400, 
            detail="S3 storage is not configured. Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY."
        )
    
    migration_check = await check_local_assets_need_migration()
    if migration_check["local_assets_count"] == 0:
        return {"message": "No local assets to migrate", "migrated": 0}
    
    storage = get_storage_service()
    assets_db = assets_collection()
    
    # Find all assets with local:// paths
    local_assets = await assets_db.find(
        {"url": {"$regex": "^local://"}},
        {"_id": 0}
    ).to_list(1000)
    
    migrated = 0
    errors = []
    
    for asset in local_assets:
        try:
            local_path = Path(asset["url"][8:])  # Remove local:// prefix
            
            if not local_path.exists():
                errors.append(f"File not found: {asset['id']}")
                continue
            
            # Read file
            async with aiofiles.open(local_path, "rb") as f:
                file_data = await f.read()
            
            # Determine content type
            content_type = asset.get("mimeType") or "application/octet-stream"
            filename = asset.get("name") or local_path.name
            
            # Upload to S3
            new_url = await storage.upload_file(
                file_data=file_data,
                filename=filename,
                content_type=content_type,
                folder=f"migrated/{asset.get('clientId', 'unknown')}"
            )
            
            # Update asset record
            await assets_db.update_one(
                {"id": asset["id"]},
                {"$set": {"url": new_url, "migratedFromLocal": True}}
            )
            
            migrated += 1
            
        except Exception as e:
            errors.append(f"Failed to migrate {asset['id']}: {str(e)}")
    
    return {
        "message": f"Migrated {migrated} assets to S3",
        "migrated": migrated,
        "errors": errors if errors else None
    }
