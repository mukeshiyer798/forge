import uuid
from datetime import datetime
from sqlmodel import SQLModel

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
