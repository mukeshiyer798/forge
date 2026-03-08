import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.utils.date_utils import get_datetime_utc

if TYPE_CHECKING:
    from app.entities.user import User

class ReadingBase(SQLModel):
    title: str = Field(max_length=500)
    url: str | None = Field(default=None, max_length=2000)
    source: str | None = Field(default=None, max_length=255)
    category: str = Field(default="general", max_length=50)  # tech, finance, health, productivity, motivation, general
    content_type: str = Field(default="article", max_length=50)  # article, book, video, podcast, paper
    summary: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=2000)
    is_default: bool = Field(default=False)  # System-seeded default content

class Reading(ReadingBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    is_bookmarked: bool = Field(default=False)
    is_read: bool = Field(default=False)
    created_at: datetime | None = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

class ReadingInsightBase(SQLModel):
    title: str = Field(max_length=500)
    url: str = Field(max_length=2000)
    content_summary: str | None = Field(default=None)
    key_takeaways: str | None = Field(default=None)  # JSON string array
    actionable_advice: str | None = Field(default=None)  # JSON string array
    read_time_minutes: int | None = Field(default=None)
    
    # Intelligence Feed Contextual Fields
    hook: str | None = Field(default=None)
    before: str | None = Field(default=None)
    after: str | None = Field(default=None)
    why_it_matters: str | None = Field(default=None)

class ReadingInsight(ReadingInsightBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    owner: "User" = Relationship(back_populates="reading_insights")
