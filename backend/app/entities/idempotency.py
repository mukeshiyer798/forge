import uuid
from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime, timezone

class IdempotencyRecord(SQLModel, table=True):
    idempotency_key: str = Field(index=True, primary_key=True, max_length=255)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True, nullable=True)
    path: str = Field(max_length=255)
    status_code: int
    response_body: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
