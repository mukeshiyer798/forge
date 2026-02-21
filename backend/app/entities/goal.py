import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Column
from sqlmodel import Field, Relationship, SQLModel
from app.core.security import EncryptedString

from app.utils.date_utils import get_datetime_utc

if TYPE_CHECKING:
    from app.entities.user import User
    from app.entities.pomodoro import PomodoroSession
    from app.entities.spaced_repetition import SpacedRepetitionItem

class GoalBase(SQLModel):
    name: str = Field(sa_column=Column(EncryptedString(255)))
    type: str = Field(max_length=50)
    description: str | None = Field(default=None, sa_column=Column(EncryptedString(1000)))
    target_date: str | None = Field(default=None, max_length=50)
    status: str = Field(default='on-track', max_length=50)
    priority: int | None = Field(default=None)
    daily_task_requirement: int | None = Field(default=None)
    progress: int = Field(default=0, ge=0, le=100)
    subtopics: str | None = Field(default=None, sa_column=Column(EncryptedString()))
    resources: str | None = Field(default=None, sa_column=Column(EncryptedString()))
    topics: str | None = Field(default=None, sa_column=Column(EncryptedString()))
    capstone: str | None = Field(default=None, sa_column=Column(EncryptedString()))
    future_look: str | None = Field(default=None, sa_column=Column(EncryptedString()))

class Goal(GoalBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    last_logged_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    owner: "User" = Relationship(back_populates="goals")
    pomodoro_sessions: list["PomodoroSession"] = Relationship(back_populates="goal")
    spaced_repetition_items: list["SpacedRepetitionItem"] = Relationship(back_populates="goal")
