import uuid
import orjson
from app.repositories.goal_repository import GoalRepository
from app.models.goal import GoalCreate, GoalUpdate
from app.entities.goal import Goal
from app.entities.user import User
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("services.goal")

class GoalService:
    def __init__(self, repo: GoalRepository):
        self.repo = repo

    def validate_goal_data(self, data: dict) -> dict:
        if 'type' in data and data['type']:
            if data['type'] not in settings.GOAL_ALLOWED_TYPES:
                raise ValueError(f"Invalid goal type. Must be one of: {settings.GOAL_ALLOWED_TYPES}")
        
        if 'status' in data and data['status']:
            if data['status'] not in settings.GOAL_ALLOWED_STATUSES:
                raise ValueError(f"Invalid status. Must be one of: {settings.GOAL_ALLOWED_STATUSES}")
        
        if 'progress' in data and data['progress'] is not None:
            if not isinstance(data['progress'], int) or data['progress'] < 0 or data['progress'] > 100:
                raise ValueError("Progress must be an integer between 0 and 100")
        
        if 'priority' in data and data['priority'] is not None:
            if not isinstance(data['priority'], int) or data['priority'] < 1 or data['priority'] > 9:
                raise ValueError("Priority must be an integer between 1 and 9")
        
        if 'daily_task_requirement' in data and data['daily_task_requirement'] is not None:
            if not isinstance(data['daily_task_requirement'], int) or data['daily_task_requirement'] < 1:
                raise ValueError("Daily task requirement must be a positive integer")
        
        json_fields = ['subtopics', 'resources', 'topics', 'capstone']
        # Note: future_look is a plain text string, NOT a JSON blob — exclude it from JSON validation.
        for field in json_fields:
            if field in data and data[field] is not None:
                if isinstance(data[field], str):
                    try:
                        orjson.loads(data[field])
                    except orjson.JSONDecodeError:
                        raise ValueError(f"Invalid JSON in {field}")
                elif not isinstance(data[field], (dict, list)):
                    raise ValueError(f"{field} must be valid JSON")
        
        return data

    def get_goals(self, user: User, skip: int, limit: int) -> tuple[list[Goal], int]:
        if user.is_superuser:
            return self.repo.get_all(skip, limit)
        return self.repo.get_by_owner_id(user.id, skip, limit)

    def get_goal(self, id: uuid.UUID, user: User) -> Goal | None:
        goal = self.repo.get_by_id(id)
        if not goal:
            return None
        if not user.is_superuser and goal.owner_id != user.id:
            raise PermissionError("Not enough permissions")
        return goal

    def create(self, goal_in: GoalCreate, owner_id: uuid.UUID) -> Goal:
        # ── Enforce max 3 active goals ──
        active_count = self.repo.count_active_goals(owner_id)
        if active_count >= settings.MAX_ACTIVE_GOALS:
            logger.warning("goal.create.limit_hit", extra={
                "user_id": str(owner_id),
                "active_count": active_count,
                "max_allowed": settings.MAX_ACTIVE_GOALS,
            })
            raise ValueError(f"You can only have up to {settings.MAX_ACTIVE_GOALS} active goals. Please complete or pause existing goals to add more.")

        goal_data = goal_in.model_dump()
        self.validate_goal_data(goal_data)
        
        json_fields = ['subtopics', 'resources', 'topics', 'capstone']
        for field in json_fields:
            if field in goal_data and goal_data[field] is not None and isinstance(goal_data[field], (dict, list)):
                goal_data[field] = orjson.dumps(goal_data[field]).decode("utf-8")
        
        goal = Goal(**goal_data, owner_id=owner_id)
        created_goal = self.repo.save(goal)
        logger.info("goal.created", extra={
            "user_id": str(owner_id),
            "goal_id": str(goal.id),
            "type": goal.type,
        })
        return created_goal

    def update(self, id: uuid.UUID, goal_in: GoalUpdate, user: User) -> Goal | None:
        goal = self.get_goal(id, user)
        if not goal:
            return None
            
        goal_data = goal_in.model_dump(exclude_unset=True)
        self.validate_goal_data(goal_data)
        
        json_fields = ['subtopics', 'resources', 'topics', 'capstone']
        for field in json_fields:
            if field in goal_data and goal_data[field] is not None and isinstance(goal_data[field], (dict, list)):
                goal_data[field] = orjson.dumps(goal_data[field]).decode("utf-8")
        
        for field, value in goal_data.items():
            setattr(goal, field, value)
            
        return self.repo.save(goal)

    def delete(self, id: uuid.UUID, user: User) -> bool:
        goal = self.get_goal(id, user)
        if not goal:
            return False
            
        self.repo.delete(goal)
        logger.info("goal.deleted", extra={
            "user_id": str(user.id),
            "goal_id": str(id),
        })
        return True

    def toggle_pause(self, id: uuid.UUID, user: User) -> Goal | None:
        """Toggle a goal between 'paused' and 'on-track'."""
        goal = self.get_goal(id, user)
        if not goal:
            return None

        previous_status = goal.status
        goal.status = 'on-track' if goal.status == 'paused' else 'paused'
        saved = self.repo.save(goal)
        logger.info("goal.pause_toggled", extra={
            "user_id": str(user.id),
            "goal_id": str(id),
            "from_status": previous_status,
            "to_status": goal.status,
        })
        return saved
