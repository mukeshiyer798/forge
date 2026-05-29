import uuid
from sqlmodel import Session, select, func, col
from app.entities.goal import Goal
from app.entities.pomodoro import PomodoroSession

class GoalRepository:
    def __init__(self, session: Session):
        self.session = session

    def save(self, goal: Goal) -> Goal:
        self.session.add(goal)
        self.session.commit()
        self.session.refresh(goal)
        return goal

    def get_by_id(self, id: uuid.UUID) -> Goal | None:
        return self.session.get(Goal, id)

    def get_by_owner_id(self, owner_id: uuid.UUID, skip: int, limit: int) -> tuple[list[Goal], int]:
        count_statement = select(func.count()).select_from(Goal).where(Goal.owner_id == owner_id)
        count = self.session.exec(count_statement).one()
        statement = select(Goal).where(Goal.owner_id == owner_id).order_by(col(Goal.created_at).desc()).offset(skip).limit(limit)
        goals = self.session.exec(statement).all()
        return goals, count

    def get_all(self, skip: int, limit: int) -> tuple[list[Goal], int]:
        count = self.session.exec(select(func.count()).select_from(Goal)).one()
        statement = select(Goal).order_by(col(Goal.created_at).desc()).offset(skip).limit(limit)
        goals = self.session.exec(statement).all()
        return goals, count

    def count_active_goals(self, owner_id: uuid.UUID) -> int:
        """Count goals that are neither completed nor paused (i.e. truly active)."""
        excluded_statuses = ['completed', 'paused']
        statement = (
            select(func.count())
            .select_from(Goal)
            .where(Goal.owner_id == owner_id, Goal.status.not_in(excluded_statuses))  # type: ignore[union-attr]
        )
        return self.session.exec(statement).one()

    def get_by_share_token(self, share_token: uuid.UUID) -> Goal | None:
        statement = select(Goal).where(Goal.share_token == share_token, Goal.is_public == True)  # noqa: E712
        return self.session.exec(statement).first()

    def get_total_focus_minutes(self, goal_id: uuid.UUID) -> int:
        """Sum completed focus pomodoro minutes for a goal."""
        statement = (
            select(func.sum(PomodoroSession.duration))
            .where(
                PomodoroSession.goal_id == goal_id,
                PomodoroSession.completed == True,  # noqa: E712
                PomodoroSession.session_type == 'focus',
            )
        )
        result = self.session.exec(statement).one()
        return result or 0

    def delete(self, goal: Goal) -> None:
        self.session.delete(goal)
        self.session.commit()
