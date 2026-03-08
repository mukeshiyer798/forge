import uuid
from datetime import datetime, timezone
from app.repositories.pomodoro_repository import PomodoroRepository
from app.repositories.goal_repository import GoalRepository
from app.models.pomodoro import PomodoroSessionCreate, PomodoroSessionUpdate
from app.entities.pomodoro import PomodoroSession
from app.entities.user import User
from app.core.logging import get_logger

logger = get_logger("services.pomodoro")

class PomodoroService:
    def __init__(self, repo: PomodoroRepository, goal_repo: GoalRepository):
        self.repo = repo
        self.goal_repo = goal_repo

    def create(self, session_in: PomodoroSessionCreate, user: User) -> PomodoroSession:
        if session_in.goal_id:
            goal = self.goal_repo.get_by_id(session_in.goal_id)
            if not goal:
                logger.warning("pomodoro.create.goal_not_found", extra={
                    "user_id": str(user.id),
                    "goal_id": str(session_in.goal_id),
                })
                raise ValueError("Goal not found")
            if goal.owner_id != user.id:
                logger.warning("pomodoro.create.permission_denied", extra={
                    "user_id": str(user.id),
                    "goal_id": str(session_in.goal_id),
                    "goal_owner_id": str(goal.owner_id),
                })
                raise PermissionError("Not enough permissions to use this goal")

        db_session = PomodoroSession(
            owner_id=user.id,
            goal_id=session_in.goal_id,
            topic_id=session_in.topic_id,
            duration=session_in.duration,
            session_type=session_in.session_type,
        )
        saved = self.repo.save(db_session)
        logger.info("pomodoro.session.created", extra={
            "user_id": str(user.id),
            "session_id": str(saved.id),
            "goal_id": str(session_in.goal_id) if session_in.goal_id else None,
            "duration": session_in.duration,
            "session_type": session_in.session_type,
        })
        return saved

    def get_sessions(self, user: User, skip: int, limit: int) -> tuple[list[PomodoroSession], int]:
        return self.repo.get_by_owner_id(user.id, skip, limit)

    def update(self, id: uuid.UUID, session_in: PomodoroSessionUpdate, user: User) -> PomodoroSession | None:
        db_session = self.repo.get_by_id(id)
        if not db_session:
            logger.warning("pomodoro.update.not_found", extra={
                "user_id": str(user.id),
                "session_id": str(id),
            })
            return None
        if db_session.owner_id != user.id:
            logger.warning("pomodoro.update.permission_denied", extra={
                "user_id": str(user.id),
                "session_id": str(id),
            })
            raise PermissionError("Not enough permissions")

        update_data = session_in.model_dump(exclude_unset=True)
        if "end_time" not in update_data and update_data.get("completed"):
            update_data["end_time"] = datetime.now(timezone.utc)

        for field, value in update_data.items():
            setattr(db_session, field, value)

        saved = self.repo.save(db_session)
        if update_data.get("completed"):
            logger.info("pomodoro.session.completed", extra={
                "user_id": str(user.id),
                "session_id": str(id),
                "duration": db_session.duration,
            })
        else:
            logger.info("pomodoro.session.updated", extra={
                "user_id": str(user.id),
                "session_id": str(id),
                "fields": list(update_data.keys()),
            })
        return saved

    def get_stats(self, user: User) -> dict:
        sessions = self.repo.get_completed_focus_sessions(user.id)

        total_minutes = sum(s.duration for s in sessions)
        total_sessions = len(sessions)

        goal_counts: dict[str, int] = {}
        for s in sessions:
            if s.goal_id:
                key = str(s.goal_id)
                goal_counts[key] = goal_counts.get(key, 0) + 1

        logger.debug("pomodoro.stats.fetched", extra={
            "user_id": str(user.id),
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
        })
        return {
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "by_goal": goal_counts,
        }

    def get_active_session(self, user: User) -> PomodoroSession | None:
        return self.repo.get_active_session(user.id)
