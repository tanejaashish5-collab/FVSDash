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
