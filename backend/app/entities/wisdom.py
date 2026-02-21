import uuid
from datetime import datetime
from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel
from app.utils.date_utils import get_datetime_utc

class WisdomBase(SQLModel):
    title: str = Field(max_length=500)
    book: str | None = Field(default=None, max_length=500)
    author: str | None = Field(default=None, max_length=255)
    category: str = Field(default="mindset", max_length=100)
    summary: str = Field(max_length=2000)
    key_lesson: str = Field(max_length=2000)
    how_to_apply: str = Field(max_length=2000)

class Wisdom(WisdomBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
