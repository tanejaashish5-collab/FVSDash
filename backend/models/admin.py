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


class ClientSummary(BaseModel):
    clientId: str
    clientName: str
    recentSubmissions: List[dict] = []
    metricsLast30Days: dict = {}
    billingStatus: Optional[str] = None
    billingPlan: Optional[str] = None
