import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, PomodoroServiceDep
from app.core.logging import get_logger
from app.models.pomodoro import (
    PomodoroSessionCreate,
    PomodoroSessionPublic,
    PomodoroSessionUpdate,
    PomodoroSessionsPublic,
)

logger = get_logger("routes.pomodoro")

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])


@router.post("/sessions", response_model=PomodoroSessionPublic)
def create_pomodoro_session(
    *,
    pomodoro_service: PomodoroServiceDep,
    current_user: CurrentUser,
    session_in: PomodoroSessionCreate,
) -> Any:
    """Start a new pomodoro session."""
    try:
        session = pomodoro_service.create(session_in=session_in, user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
        
    return session


@router.get("/sessions", response_model=PomodoroSessionsPublic)
def read_pomodoro_sessions(
    pomodoro_service: PomodoroServiceDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get pomodoro sessions for the current user."""
    sessions, count = pomodoro_service.get_sessions(user=current_user, skip=skip, limit=limit)
    return PomodoroSessionsPublic(data=[PomodoroSessionPublic.model_validate(s) for s in sessions], count=count)


@router.put("/sessions/{id}", response_model=PomodoroSessionPublic)
def update_pomodoro_session(
    *,
    pomodoro_service: PomodoroServiceDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    session_in: PomodoroSessionUpdate,
) -> Any:
    """Update a pomodoro session (complete, set end_time)."""
    try:
        session = pomodoro_service.update(id=id, session_in=session_in, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return session


@router.get("/stats")
def get_pomodoro_stats(
    pomodoro_service: PomodoroServiceDep,
    current_user: CurrentUser,
) -> Any:
    """Get pomodoro statistics for the current user."""
    return pomodoro_service.get_stats(user=current_user)


@router.get("/active", response_model=PomodoroSessionPublic | None)
def get_active_pomodoro_session(
    pomodoro_service: PomodoroServiceDep,
    current_user: CurrentUser,
) -> Any:
    """Get the currently active pomodoro session for the current user."""
    return pomodoro_service.get_active_session(user=current_user)

