import uuid
from datetime import datetime, timezone

from pydantic import EmailStr
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    nudge_preference: str = Field(default="daily", max_length=32)
    # Email preferences for daily plan
    email_daily_plan_enabled: bool = Field(default=True)
    email_morning_time: str = Field(default="07:00", max_length=5)
    email_afternoon_time: str = Field(default="14:00", max_length=5)
    email_evening_time: str = Field(default="20:00", max_length=5)
    timezone: str = Field(default="UTC", max_length=64)
    # Personalization
    theme_preference: str | None = Field(default=None, max_length=32)
    greeting_preference: str | None = Field(default=None, max_length=100)
    status_message: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    nudge_preference: str = Field(default="daily", max_length=32)


# Properties to receive via API on update, all are optional
class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    nudge_preference: str | None = Field(default=None, max_length=32)
    email_daily_plan_enabled: bool | None = None
    email_morning_time: str | None = Field(default=None, max_length=5)
    email_afternoon_time: str | None = Field(default=None, max_length=5)
    email_evening_time: str | None = Field(default=None, max_length=5)
    timezone: str | None = Field(default=None, max_length=64)
    theme_preference: str | None = Field(default=None, max_length=32)
    greeting_preference: str | None = Field(default=None, max_length=100)
    status_message: str | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
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


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# Goal Models
class GoalBase(SQLModel):
    name: str = Field(max_length=255)
    type: str = Field(max_length=50)  # 'learn' | 'build' | 'habit' | 'fitness'
    description: str | None = Field(default=None, max_length=1000)
    target_date: str | None = Field(default=None, max_length=50)
    status: str = Field(default='on-track', max_length=50)  # 'on-track' | 'at-risk' | 'behind'
    priority: int | None = Field(default=None)
    daily_task_requirement: int | None = Field(default=None)
    progress: int = Field(default=0, ge=0, le=100)
    # JSON fields for complex data
    subtopics: str | None = Field(default=None)  # JSON string
    resources: str | None = Field(default=None)  # JSON string
    topics: str | None = Field(default=None)  # JSON string
    capstone: str | None = Field(default=None)  # JSON string


class GoalCreate(GoalBase):
    pass


class GoalUpdate(SQLModel):
    name: str | None = Field(default=None, max_length=255)
    type: str | None = Field(default=None, max_length=50)
    description: str | None = Field(default=None, max_length=1000)
    target_date: str | None = Field(default=None, max_length=50)
    status: str | None = Field(default=None, max_length=50)
    priority: int | None = None
    daily_task_requirement: int | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    subtopics: str | None = None
    resources: str | None = None
    topics: str | None = None
    capstone: str | None = None


class Goal(GoalBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    last_logged_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner: User | None = Relationship(back_populates="goals")
    pomodoro_sessions: list["PomodoroSession"] = Relationship(back_populates="goal")
    spaced_repetition_items: list["SpacedRepetitionItem"] = Relationship(back_populates="goal")


# Pomodoro Session Model
class PomodoroSessionBase(SQLModel):
    goal_id: uuid.UUID | None = Field(default=None, foreign_key="goal.id", ondelete="SET NULL")
    topic_id: str | None = Field(default=None, max_length=100)
    duration: int = Field(default=25, ge=1, le=120)  # minutes
    session_type: str = Field(default="focus", max_length=20)  # focus | short-break | long-break
    completed: bool = Field(default=False)


class PomodoroSession(PomodoroSessionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    start_time: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    end_time: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner: User | None = Relationship(back_populates="pomodoro_sessions")
    goal: Goal | None = Relationship(back_populates="pomodoro_sessions")


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


# Spaced Repetition Model
class SpacedRepetitionItemBase(SQLModel):
    goal_id: uuid.UUID = Field(foreign_key="goal.id", nullable=False, ondelete="CASCADE")
    topic_id: str = Field(max_length=100)
    topic_name: str = Field(max_length=255)
    active_recall_question: str | None = Field(default=None, max_length=1000)
    resources: str | None = Field(default=None)  # JSON array of resource titles
    ease_factor: float = Field(default=2.5, ge=1.3, le=10.0)
    interval_days: int = Field(default=1, ge=0)
    review_count: int = Field(default=0, ge=0)
    consecutive_correct: int = Field(default=0, ge=0)


class SpacedRepetitionItem(SpacedRepetitionItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    last_reviewed_at: datetime | None = Field(
        default=None,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    next_review_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    created_at: datetime | None = Field(
        default_factory=get_datetime_utc,
        sa_type=DateTime(timezone=True),  # type: ignore
    )
    owner: User | None = Relationship(back_populates="spaced_repetition_items")
    goal: Goal | None = Relationship(back_populates="spaced_repetition_items")


class SpacedRepetitionItemCreate(SQLModel):
    goal_id: uuid.UUID
    topic_id: str
    topic_name: str
    active_recall_question: str | None = None
    resources: str | None = None


class SpacedRepetitionReview(SQLModel):
    correct: bool


class SpacedRepetitionItemPublic(SQLModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    goal_id: uuid.UUID
    topic_id: str
    topic_name: str
    active_recall_question: str | None
    resources: str | None
    ease_factor: float
    interval_days: int
    review_count: int
    consecutive_correct: int
    last_reviewed_at: datetime | None
    next_review_at: datetime | None
    created_at: datetime | None


class SpacedRepetitionItemsPublic(SQLModel):
    data: list[SpacedRepetitionItemPublic]
    count: int


class GoalPublic(GoalBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None
    last_logged_at: datetime | None = None


class GoalsPublic(SQLModel):
    data: list[GoalPublic]
    count: int
