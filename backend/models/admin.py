"""Admin-related Pydantic models."""
from pydantic import BaseModel
from typing import Optional, List


class ImpersonateRequest(BaseModel):
    clientId: str


class ImpersonateResponse(BaseModel):
    clientId: str
    clientName: str


class ClientMetrics(BaseModel):
    id: str
    name: str
    primaryContactName: Optional[str] = None
    primaryContactEmail: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    submissionsCount: int = 0
    lastActivityDate: Optional[str] = None
    # Sprint 12 additions
    channel_name: Optional[str] = None
    subscriber_count: Optional[int] = None
    total_videos: int = 0
    youtube_connected: bool = False
    is_active: bool = True


class ClientSummary(BaseModel):
    clientId: str
    clientName: str
    recentSubmissions: List[dict] = []
    metricsLast30Days: dict = {}
    billingStatus: Optional[str] = None
    billingPlan: Optional[str] = None


# Sprint 12: Multi-Channel Onboarding
class CreateClientRequest(BaseModel):
    full_name: str
    email: str
    password: str
    channel_description: Optional[str] = None
    niche: Optional[str] = None
    content_pillars: List[str] = []
    language_style: str = "English"


class CreateClientResponse(BaseModel):
    user_id: str
    email: str
    full_name: str
    created_at: str


class UpdateClientRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    channel_description: Optional[str] = None
    niche: Optional[str] = None
