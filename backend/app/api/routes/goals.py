import uuid
from typing import Any
import json

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Goal, GoalCreate, GoalPublic, GoalsPublic, GoalUpdate, Message

router = APIRouter(prefix="/goals", tags=["goals"])


def validate_goal_data(data: dict) -> dict:
    """Validate and sanitize goal data to prevent injection attacks."""
    # Validate type
    if 'type' in data and data['type']:
        allowed_types = ['learn', 'build', 'habit', 'fitness']
        if data['type'] not in allowed_types:
            raise HTTPException(status_code=400, detail=f"Invalid goal type. Must be one of: {allowed_types}")
    
    # Validate status
    if 'status' in data and data['status']:
        allowed_statuses = ['on-track', 'at-risk', 'behind']
        if data['status'] not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {allowed_statuses}")
    
    # Validate progress range
    if 'progress' in data and data['progress'] is not None:
        if not isinstance(data['progress'], int) or data['progress'] < 0 or data['progress'] > 100:
            raise HTTPException(status_code=400, detail="Progress must be an integer between 0 and 100")
    
    # Validate priority range
    if 'priority' in data and data['priority'] is not None:
        if not isinstance(data['priority'], int) or data['priority'] < 1 or data['priority'] > 9:
            raise HTTPException(status_code=400, detail="Priority must be an integer between 1 and 9")
    
    # Validate daily_task_requirement
    if 'daily_task_requirement' in data and data['daily_task_requirement'] is not None:
        if not isinstance(data['daily_task_requirement'], int) or data['daily_task_requirement'] < 1:
            raise HTTPException(status_code=400, detail="Daily task requirement must be a positive integer")
    
    # Validate JSON fields
    json_fields = ['subtopics', 'resources', 'topics', 'capstone']
    for field in json_fields:
        if field in data and data[field] is not None:
            if isinstance(data[field], str):
                try:
                    json.loads(data[field])  # Validate JSON
                except json.JSONDecodeError:
                    raise HTTPException(status_code=400, detail=f"Invalid JSON in {field}")
            elif not isinstance(data[field], (dict, list)):
                raise HTTPException(status_code=400, detail=f"{field} must be valid JSON")
    
    return data


@router.get("/", response_model=GoalsPublic)
def read_goals(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve goals for the current user only (RBAC enforced).
    """
    # Only return goals owned by the current user
    count_statement = (
        select(func.count())
        .select_from(Goal)
        .where(Goal.owner_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    
    statement = (
        select(Goal)
        .where(Goal.owner_id == current_user.id)
        .order_by(col(Goal.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    goals = session.exec(statement).all()
    
    return GoalsPublic(data=goals, count=count)


@router.get("/{id}", response_model=GoalPublic)
def read_goal(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Retrieve a specific goal. Only accessible by the owner (RBAC enforced).
    """
    goal = session.get(Goal, id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # RBAC: Ensure user owns this goal
    if goal.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return goal


@router.post("/", response_model=GoalPublic)
def create_goal(
    *, session: SessionDep, current_user: CurrentUser, goal_in: GoalCreate
) -> Any:
    """
    Create a new goal. Automatically assigned to current user (RBAC enforced).
    """
    # Validate input data
    goal_data = goal_in.model_dump()
    validate_goal_data(goal_data)
    
    # Convert dict/list to JSON string for JSON fields
    json_fields = ['subtopics', 'resources', 'topics', 'capstone']
    for field in json_fields:
        if field in goal_data and goal_data[field] is not None and isinstance(goal_data[field], (dict, list)):
            goal_data[field] = json.dumps(goal_data[field])
    
    # Create goal with owner_id set to current user
    goal = Goal(**goal_data, owner_id=current_user.id)
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal


@router.put("/{id}", response_model=GoalPublic)
def update_goal(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    goal_in: GoalUpdate,
) -> Any:
    """
    Update a goal. Only accessible by the owner (RBAC enforced).
    """
    goal = session.get(Goal, id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # RBAC: Ensure user owns this goal
    if goal.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Validate input data
    goal_data = goal_in.model_dump(exclude_unset=True)
    validate_goal_data(goal_data)
    
    # Convert dict/list to JSON string for JSON fields
    json_fields = ['subtopics', 'resources', 'topics', 'capstone']
    for field in json_fields:
        if field in goal_data and goal_data[field] is not None and isinstance(goal_data[field], (dict, list)):
            goal_data[field] = json.dumps(goal_data[field])
    
    for field, value in goal_data.items():
        setattr(goal, field, value)
    
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return goal


@router.delete("/{id}", response_model=Message)
def delete_goal(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Delete a goal. Only accessible by the owner (RBAC enforced).
    """
    goal = session.get(Goal, id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # RBAC: Ensure user owns this goal
    if goal.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    session.delete(goal)
    session.commit()
    return Message(message="Goal deleted successfully")
