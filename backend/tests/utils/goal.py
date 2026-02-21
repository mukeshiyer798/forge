"""Test utility: create random goals for test cases."""
import json
import uuid
from sqlmodel import Session

from app.entities.goal import Goal
from tests.utils.user import create_random_user
from tests.utils.utils import random_lower_string


def create_random_goal(
    db: Session,
    *,
    owner_id: uuid.UUID | None = None,
    status: str = "on-track",
    goal_type: str = "learn",
) -> Goal:
    """Create and persist a random Goal.

    If no owner_id is given, a new random user is created.
    """
    if owner_id is None:
        user = create_random_user(db)
        owner_id = user.id

    goal = Goal(
        name=random_lower_string(),
        type=goal_type,
        description=random_lower_string(),
        status=status,
        priority=1,
        owner_id=owner_id,
        subtopics=json.dumps([{"id": "s1", "name": "test subtopic"}]),
        resources=json.dumps([{"id": "r1", "title": "test resource"}]),
        topics=json.dumps([{"id": "t1", "name": "test topic"}]),
        capstone=json.dumps({"name": "test capstone"}),
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal
