import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.utils.date_utils import get_datetime_utc

if TYPE_CHECKING:
    from app.entities.user import User
    from app.entities.goal import Goal

class PomodoroSessionBase(SQLModel):
    goal_id: uuid.UUID | None = Field(default=None, foreign_key="goal.id", ondelete="SET NULL")
    topic_id: str | None = Field(default=None, max_length=100)
    duration: int = Field(default=25, ge=1, le=120)
    session_type: str = Field(default="focus", max_length=20)
    completed: bool = Field(default=False)

class PomodoroSession(PomodoroSessionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    start_time: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    end_time: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    owner: "User" = Relationship(back_populates="pomodoro_sessions")
    goal: "Goal" = Relationship(back_populates="pomodoro_sessions")
