import uuid
from datetime import datetime, timezone
from app.repositories.pomodoro_repository import PomodoroRepository
from app.repositories.goal_repository import GoalRepository
from app.models.pomodoro import PomodoroSessionCreate, PomodoroSessionUpdate
from app.entities.pomodoro import PomodoroSession
from app.entities.user import User

class PomodoroService:
    def __init__(self, repo: PomodoroRepository, goal_repo: GoalRepository):
        self.repo = repo
        self.goal_repo = goal_repo

    def create(self, session_in: PomodoroSessionCreate, user: User) -> PomodoroSession:
        if session_in.goal_id:
            goal = self.goal_repo.get_by_id(session_in.goal_id)
            if not goal:
                raise ValueError("Goal not found")
            if goal.owner_id != user.id:
                raise PermissionError("Not enough permissions to use this goal")

        db_session = PomodoroSession(
            owner_id=user.id,
            goal_id=session_in.goal_id,
            topic_id=session_in.topic_id,
            duration=session_in.duration,
            session_type=session_in.session_type,
        )
        return self.repo.save(db_session)

    def get_sessions(self, user: User, skip: int, limit: int) -> tuple[list[PomodoroSession], int]:
        return self.repo.get_by_owner_id(user.id, skip, limit)

    def update(self, id: uuid.UUID, session_in: PomodoroSessionUpdate, user: User) -> PomodoroSession | None:
        db_session = self.repo.get_by_id(id)
        if not db_session:
            return None
        if db_session.owner_id != user.id:
            raise PermissionError("Not enough permissions")

        update_data = session_in.model_dump(exclude_unset=True)
        if "end_time" not in update_data and update_data.get("completed"):
            update_data["end_time"] = datetime.now(timezone.utc)

        for field, value in update_data.items():
            setattr(db_session, field, value)

        return self.repo.save(db_session)

    def get_stats(self, user: User) -> dict:
        sessions = self.repo.get_completed_focus_sessions(user.id)
        
        total_minutes = sum(s.duration for s in sessions)
        total_sessions = len(sessions)

        goal_counts: dict[str, int] = {}
        for s in sessions:
            if s.goal_id:
                key = str(s.goal_id)
                goal_counts[key] = goal_counts.get(key, 0) + 1

        return {
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "by_goal": goal_counts,
        }

    def get_active_session(self, user: User) -> PomodoroSession | None:
        return self.repo.get_active_session(user.id)
