"""
Public (unauthenticated) endpoints.

These routes are intentionally open — they serve read-only snapshots of
goals that the owner has explicitly made public via the share toggle.
"""
import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import GoalServiceDep
from app.models.goal import GoalSharePublic
from app.core.logging import get_logger

logger = get_logger("routes.public")

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/goals/{share_token}", response_model=GoalSharePublic)
def read_public_goal(goal_service: GoalServiceDep, share_token: uuid.UUID) -> Any:
    """
    Retrieve a public, read-only snapshot of a shared goal.
    No authentication required.
    """
    snapshot = goal_service.get_public_goal(share_token=share_token)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Shared goal not found or sharing has been disabled")

    logger.info("public.goal.viewed", extra={"share_token": str(share_token), "goal_id": str(snapshot.id)})
    return snapshot
