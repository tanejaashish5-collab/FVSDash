"""FVS System routes - Brain & Orchestrator."""
from fastapi import APIRouter, Depends
from typing import Optional

from models.fvs import (
    FvsProposeIdeasRequest, FvsProduceEpisodeRequest,
    FvsIdeaStatusUpdate, FvsAutomationUpdate
)
from services.auth_service import get_current_user, get_client_id_from_user
from services import fvs_service

router = APIRouter(prefix="/fvs", tags=["fvs"])


@router.post("/propose-ideas")
async def fvs_propose_ideas(data: FvsProposeIdeasRequest, user: dict = Depends(get_current_user)):
    """
    FVS Brain: Analyzes client data and proposes new episode ideas.
    Creates FvsIdea entries and a BrainSnapshot summarizing patterns.
    """
    client_id = get_client_id_from_user(user)
    return await fvs_service.propose_ideas(client_id, data.format, data.range)


@router.post("/produce-episode")
async def fvs_produce_episode(data: FvsProduceEpisodeRequest, user: dict = Depends(get_current_user)):
    """
    FVS Orchestrator: Produces a full episode from an approved idea.
    Creates Script, Submission, Audio/Video/Thumbnail Assets (mocked providers).
    """
    client_id = get_client_id_from_user(user)
    return await fvs_service.produce_episode(client_id, data.ideaId, data.mode)


@router.get("/ideas")
async def get_fvs_ideas(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None
):
    """Returns FVS ideas for the current client, optionally filtered by status."""
    client_id = get_client_id_from_user(user)
    return await fvs_service.get_ideas(client_id, status)


@router.patch("/ideas/{idea_id}/status")
async def update_fvs_idea_status(idea_id: str, data: FvsIdeaStatusUpdate, user: dict = Depends(get_current_user)):
    """Update the status of an FVS idea."""
    client_id = get_client_id_from_user(user)
    return await fvs_service.update_idea_status(client_id, idea_id, data.status)


@router.get("/brain-snapshot")
async def get_fvs_brain_snapshot(user: dict = Depends(get_current_user)):
    """Returns the latest FVS brain snapshot for the current client."""
    client_id = get_client_id_from_user(user)
    return await fvs_service.get_brain_snapshot(client_id)


@router.get("/activity")
async def get_fvs_activity(user: dict = Depends(get_current_user)):
    """Returns recent FVS activity for the current client."""
    client_id = get_client_id_from_user(user)
    return await fvs_service.get_activity(client_id)


@router.get("/config")
async def get_fvs_config(user: dict = Depends(get_current_user)):
    """Returns FVS configuration for the current client."""
    client_id = get_client_id_from_user(user)
    return await fvs_service.get_config(client_id)


@router.put("/config")
async def update_fvs_config(data: FvsAutomationUpdate, user: dict = Depends(get_current_user)):
    """Updates FVS configuration for the current client."""
    client_id = get_client_id_from_user(user)
    return await fvs_service.update_config(client_id, data.automationLevel)


@router.get("/scripts")
async def get_fvs_scripts(user: dict = Depends(get_current_user), submissionId: Optional[str] = None):
    """Returns FVS-generated scripts for the current client."""
    client_id = get_client_id_from_user(user)
    return await fvs_service.get_scripts(client_id, submissionId)
