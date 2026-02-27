"""FVS System Pydantic models."""
from pydantic import BaseModel


class FvsProposeIdeasRequest(BaseModel):
    format: str = "short"  # "short" | "long"
    range: str = "30d"  # "30d" | "90d"


class FvsProduceEpisodeRequest(BaseModel):
    ideaId: str
    mode: str = "full_auto_short"  # "manual" | "semi_auto" | "full_auto_short"


class FvsIdeaStatusUpdate(BaseModel):
    status: str  # "proposed" | "approved" | "rejected" | "in_progress" | "completed"


class FvsAutomationUpdate(BaseModel):
    automationLevel: str  # "manual" | "semi_auto" | "full_auto_short"
