"""Channel Profile routes."""
from fastapi import APIRouter, Depends, Query
from typing import Optional, List

from services.auth_service import get_current_user, get_client_id_from_user
from services.channel_profile_service import (
    get_channel_profile, update_channel_profile,
    get_available_language_styles, get_available_thumbnail_styles
)
from pydantic import BaseModel

router = APIRouter(tags=["channel-profile"])


class ChannelProfileUpdate(BaseModel):
    """Request model for updating channel profile."""
    languageStyle: Optional[str] = None
    thumbnailStyle: Optional[str] = None
    brandDescription: Optional[str] = None
    tone: Optional[str] = None
    contentPillars: Optional[List[str]] = None
    thumbnailPromptTemplate: Optional[str] = None
    scriptsPerIdea: Optional[int] = None
    thumbnailsPerShort: Optional[int] = None


@router.get("/channel-profile")
async def get_profile(
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Get the current client's channel profile (Brand Brain settings)."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    return await get_channel_profile(client_id)


@router.put("/channel-profile")
async def update_profile(
    data: ChannelProfileUpdate,
    user: dict = Depends(get_current_user),
    impersonateClientId: Optional[str] = Query(None)
):
    """Update the current client's channel profile."""
    client_id = get_client_id_from_user(user, impersonateClientId)
    # Convert to dict, excluding None values
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    return await update_channel_profile(client_id, update_data)


@router.get("/channel-profile/options")
async def get_profile_options(user: dict = Depends(get_current_user)):
    """Get available options for channel profile fields (for UI dropdowns)."""
    return {
        "languageStyles": get_available_language_styles(),
        "thumbnailStyles": get_available_thumbnail_styles()
    }
