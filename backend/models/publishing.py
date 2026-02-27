"""Publishing-related Pydantic models."""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class PlatformType(str, Enum):
    youtube_shorts = "youtube_shorts"
    tiktok = "tiktok"
    instagram_reels = "instagram_reels"


class PublishingStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    posting = "posting"
    posted = "posted"
    failed = "failed"


class PublishingTaskCreate(BaseModel):
    submissionId: str
    platform: PlatformType
    scheduledAt: Optional[str] = None  # ISO datetime string


class PublishingTaskUpdate(BaseModel):
    status: Optional[PublishingStatus] = None
    scheduledAt: Optional[str] = None
    errorMessage: Optional[str] = None


class PlatformConnectionCreate(BaseModel):
    platform: PlatformType


class PlatformConnectionResponse(BaseModel):
    id: str
    clientId: str
    platform: str
    connected: bool
    accountName: Optional[str] = None
    accountHandle: Optional[str] = None
    connectedAt: Optional[str] = None
