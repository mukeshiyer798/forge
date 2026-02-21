import uuid
from datetime import datetime
from sqlmodel import SQLModel, Field
from app.entities.reading import ReadingInsightBase, ReadingBase

class ReadingCreate(ReadingBase):
    pass

class ReadingUpdate(SQLModel):
    title: str | None = Field(default=None, max_length=500)
    url: str | None = Field(default=None, max_length=2000)
    source: str | None = Field(default=None, max_length=255)
    category: str | None = Field(default=None, max_length=50)
    content_type: str | None = Field(default=None, max_length=50)
    summary: str | None = Field(default=None, max_length=2000)
    is_bookmarked: bool | None = None
    is_read: bool | None = None

class ReadingPublic(ReadingBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    is_bookmarked: bool
    is_read: bool
    created_at: datetime | None = None

class ReadingsPublic(SQLModel):
    data: list[ReadingPublic]
    count: int

class ReadingInsightCreate(ReadingInsightBase):
    pass

class ReadingInsightPublic(ReadingInsightBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None

class ReadingInsightsPublic(SQLModel):
    data: list[ReadingInsightPublic]
    count: int

