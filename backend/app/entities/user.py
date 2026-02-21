import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.core.config import settings
from app.utils.date_utils import get_datetime_utc

if TYPE_CHECKING:
    from app.entities.item import Item
    from app.entities.goal import Goal
    from app.entities.pomodoro import PomodoroSession
    from app.entities.spaced_repetition import SpacedRepetitionItem
    from app.entities.reading import ReadingInsight

class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    nudge_preference: str = Field(default="daily", max_length=32)
    email_daily_plan_enabled: bool = Field(default=True)
    email_morning_time: str = Field(default=settings.DEFAULT_EMAIL_MORNING_TIME, max_length=5)
    email_afternoon_time: str = Field(default=settings.DEFAULT_EMAIL_AFTERNOON_TIME, max_length=5)
    email_evening_time: str = Field(default=settings.DEFAULT_EMAIL_EVENING_TIME, max_length=5)
    timezone: str = Field(default="UTC", max_length=64)
    theme_preference: str | None = Field(default=None, max_length=32)
    greeting_preference: str | None = Field(default=None, max_length=100)
    status_message: str | None = Field(default=None, max_length=255)

class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    encrypted_openrouter_key: str | None = Field(default=None)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    goals: list["Goal"] = Relationship(back_populates="owner", cascade_delete=True)
    pomodoro_sessions: list["PomodoroSession"] = Relationship(
        back_populates="owner", cascade_delete=True
    )
    spaced_repetition_items: list["SpacedRepetitionItem"] = Relationship(
        back_populates="owner", cascade_delete=True
    )
    reading_insights: list["ReadingInsight"] = Relationship(
        back_populates="owner", cascade_delete=True
    )
