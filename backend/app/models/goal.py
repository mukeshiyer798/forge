import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel
from app.entities.goal import GoalBase

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
    future_look: str | None = None

class GoalPublic(GoalBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None
    last_logged_at: datetime | None = None
    is_public: bool = False
    share_token: uuid.UUID | None = None

class GoalsPublic(SQLModel):
    data: list[GoalPublic]
    count: int

# ── Public (unauthenticated) share response ──────────────────
class GoalSharePublic(SQLModel):
    """Read-only snapshot returned at /public/goals/{share_token}. No auth required."""
    id: uuid.UUID
    name: str
    type: str
    description: str | None = None
    status: str
    progress: int
    target_date: str | None = None
    topics: str | None = None          # JSON string — same as GoalPublic
    capstone: str | None = None        # JSON string
    subtopics: str | None = None       # JSON string (legacy)
    created_at: datetime | None = None
    last_logged_at: datetime | None = None
    # Owner identity (shown if full_name is set)
    owner_name: str | None = None
    # Focus stats
    total_focus_minutes: int = 0
