"""Notification Pydantic models."""
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class NotificationType(str, Enum):
    SUBMISSION = "SUBMISSION"
    STATUS_CHANGE = "STATUS_CHANGE"
    DEADLINE = "DEADLINE"
    SYSTEM = "SYSTEM"
    FVS_IDEA = "FVS_IDEA"


class NotificationPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class NotificationCreate(BaseModel):
    user_id: str
    type: NotificationType
    title: str
    message: str
    link: Optional[str] = None
    priority: NotificationPriority = NotificationPriority.MEDIUM


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: NotificationType
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    priority: NotificationPriority
    created_at: str


class UnreadCountResponse(BaseModel):
    count: int
