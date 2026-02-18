"""Admin routes - client management and impersonation."""
from fastapi import APIRouter, Depends

from models.admin import ImpersonateRequest, ImpersonateResponse, ClientMetrics, ClientSummary
from services.auth_service import require_admin
from services import admin_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/clients", response_model=list[ClientMetrics])
async def get_all_clients(user: dict = Depends(require_admin)):
    """
    Get all clients with their key metrics.
    Admin only endpoint.
    """
    return await admin_service.get_all_clients_with_metrics()


@router.get("/clients/{client_id}/summary", response_model=ClientSummary)
async def get_client_summary(client_id: str, user: dict = Depends(require_admin)):
    """
    Get detailed summary for a specific client.
    Admin only endpoint.
    """
    return await admin_service.get_client_summary(client_id)


@router.post("/impersonate", response_model=ImpersonateResponse)
async def impersonate_client(data: ImpersonateRequest, user: dict = Depends(require_admin)):
    """
    Validate client for impersonation and return client info.
    Admin only endpoint. Does not change server-side session.
    """
    return await admin_service.validate_impersonation(data.clientId)
