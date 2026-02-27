"""Settings-related Pydantic models."""
from pydantic import BaseModel
from typing import Optional


class SettingsUpdate(BaseModel):
    hourlyRate: Optional[float] = None
    hoursPerEpisode: Optional[float] = None
    brandVoiceDescription: Optional[str] = None
    primaryContactName: Optional[str] = None
    primaryContactEmail: Optional[str] = None
