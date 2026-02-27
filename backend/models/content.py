"""Content-related Pydantic models (Submissions, Assets, VideoTasks)."""
from pydantic import BaseModel
from typing import Optional


class StatusUpdate(BaseModel):
    status: str


class SubmissionCreate(BaseModel):
    title: str
    guest: str = ""
    description: str
    contentType: str
    priority: str = "Medium"
    releaseDate: Optional[str] = None
    sourceFileUrl: Optional[str] = None
    strategyIdeaId: Optional[str] = None  # Links to FVS idea if created from Strategy Lab
    recommendation_id: Optional[str] = None  # Links to AI recommendation for Brain tracking


class SubmissionUpdate(BaseModel):
    status: Optional[str] = None
    releaseDate: Optional[str] = None
    primaryThumbnailAssetId: Optional[str] = None


class PrimaryThumbnailUpdate(BaseModel):
    assetId: str


class AssetStatusUpdate(BaseModel):
    status: str


class AssetSubmissionUpdate(BaseModel):
    submissionId: Optional[str] = None


class VideoTaskCreate(BaseModel):
    provider: str  # "runway" | "veo" | "kling"
    prompt: str
    mode: str  # "script" | "audio" | "remix"
    scriptText: Optional[str] = None
    audioAssetId: Optional[str] = None
    sourceAssetId: Optional[str] = None
    aspectRatio: str = "16:9"
    outputProfile: str = "youtube_long"  # "youtube_long" | "shorts" | "reel"
    submissionId: Optional[str] = None
