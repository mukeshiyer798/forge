import uuid
from sqlmodel import Session, select, func, col
from sqlalchemy import and_
from app.entities.pomodoro import PomodoroSession

class PomodoroRepository:
    def __init__(self, session: Session):
        self.session = session

    def save(self, pomodoro_session: PomodoroSession) -> PomodoroSession:
        self.session.add(pomodoro_session)
        self.session.commit()
        self.session.refresh(pomodoro_session)
        return pomodoro_session

    def get_by_id(self, id: uuid.UUID) -> PomodoroSession | None:
        return self.session.get(PomodoroSession, id)

    def get_by_owner_id(self, owner_id: uuid.UUID, skip: int, limit: int) -> tuple[list[PomodoroSession], int]:
        count_statement = select(func.count()).select_from(PomodoroSession).where(PomodoroSession.owner_id == owner_id)
        count = self.session.exec(count_statement).one()
        statement = select(PomodoroSession).where(PomodoroSession.owner_id == owner_id).order_by(col(PomodoroSession.start_time).desc()).offset(skip).limit(limit)
        sessions = self.session.exec(statement).all()
        return sessions, count

    def get_completed_focus_sessions(self, owner_id: uuid.UUID) -> list[PomodoroSession]:
        sessions_statement = select(PomodoroSession).where(
            and_(
                PomodoroSession.owner_id == owner_id,
                PomodoroSession.completed == True,
                PomodoroSession.session_type == "focus",
            )
        )
        return self.session.exec(sessions_statement).all()
