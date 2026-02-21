import uuid
from datetime import datetime
from sqlmodel import SQLModel

class PomodoroSessionCreate(SQLModel):
    goal_id: uuid.UUID | None = None
    topic_id: str | None = None
    duration: int = 25
    session_type: str = "focus"

class PomodoroSessionUpdate(SQLModel):
    completed: bool | None = None
    end_time: datetime | None = None

class PomodoroSessionPublic(SQLModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    goal_id: uuid.UUID | None = None
    topic_id: str | None = None
    duration: int
    session_type: str
    completed: bool
    start_time: datetime | None = None
    end_time: datetime | None = None

class PomodoroSessionsPublic(SQLModel):
    data: list[PomodoroSessionPublic]
    count: int
