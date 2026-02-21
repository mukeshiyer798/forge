import uuid
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.utils.date_utils import get_datetime_utc

if TYPE_CHECKING:
    from app.entities.user import User
    from app.entities.goal import Goal

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
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    last_reviewed_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
    next_review_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    owner: "User" = Relationship(back_populates="spaced_repetition_items")
    goal: "Goal" = Relationship(back_populates="spaced_repetition_items")
