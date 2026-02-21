import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, GoalServiceDep
from app.models.goal import GoalCreate, GoalPublic, GoalsPublic, GoalUpdate
from app.models.core import Message

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/", response_model=GoalsPublic)
def read_goals(
    goal_service: GoalServiceDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve goals for the current user only (RBAC enforced).
    """
    goals, count = goal_service.get_goals(user=current_user, skip=skip, limit=limit)
    return GoalsPublic(data=goals, count=count)


@router.get("/{id}", response_model=GoalPublic)
def read_goal(goal_service: GoalServiceDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Retrieve a specific goal. Only accessible by the owner (RBAC enforced).
    """
    try:
        goal = goal_service.get_goal(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return goal


@router.post("/", response_model=GoalPublic)
def create_goal(
    *, goal_service: GoalServiceDep, current_user: CurrentUser, goal_in: GoalCreate
) -> Any:
    """
    Create a new goal. Automatically assigned to current user (RBAC enforced).
    """
    try:
        goal = goal_service.create(goal_in=goal_in, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    return goal


@router.put("/{id}", response_model=GoalPublic)
def update_goal(
    *,
    goal_service: GoalServiceDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    goal_in: GoalUpdate,
) -> Any:
    """
    Update a goal. Only accessible by the owner (RBAC enforced).
    """
    try:
        goal = goal_service.update(id=id, goal_in=goal_in, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return goal


@router.delete("/{id}", response_model=Message)
def delete_goal(
    goal_service: GoalServiceDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Delete a goal. Only accessible by the owner (RBAC enforced).
    """
    try:
        success = goal_service.delete(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return Message(message="Goal deleted successfully")


@router.patch("/{id}/pause", response_model=GoalPublic)
def toggle_pause_goal(
    goal_service: GoalServiceDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Toggle a goal between paused and on-track.
    Idempotent — calling twice restores the original status.
    """
    try:
        goal = goal_service.toggle_pause(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal
