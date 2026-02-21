import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select, Field, SQLModel

from app.api.deps import CurrentUser, SessionDep
from app.models import Message

router = APIRouter(prefix="/readings", tags=["readings"])


# ── Models ───────────────────────────────────────────────────
class ReadingBase(SQLModel):
    title: str = Field(max_length=500)
    url: str | None = Field(default=None, max_length=2000)
    source: str | None = Field(default=None, max_length=255)
    category: str = Field(default="general", max_length=50)  # tech, finance, health, productivity, motivation, general
    content_type: str = Field(default="article", max_length=50)  # article, book, video, podcast, paper
    summary: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=2000)
    is_default: bool = Field(default=False)  # System-seeded default content


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


class Reading(ReadingBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    is_bookmarked: bool = Field(default=False)
    is_read: bool = Field(default=False)
    created_at: datetime | None = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )


class ReadingPublic(ReadingBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    is_bookmarked: bool
    is_read: bool
    created_at: datetime | None = None


class ReadingsPublic(SQLModel):
    data: list[ReadingPublic]
    count: int


# ── Suggested articles by goal type ────────────────────────
SUGGESTED_ARTICLES: dict[str, list[dict[str, str]]] = {
    "tech": [
        {"title": "Hacker News — Top Stories", "url": "https://news.ycombinator.com", "source": "Hacker News", "content_type": "article"},
        {"title": "The Pragmatic Engineer Newsletter", "url": "https://newsletter.pragmaticengineer.com", "source": "Pragmatic Engineer", "content_type": "article"},
        {"title": "Martin Fowler's Blog", "url": "https://martinfowler.com", "source": "Martin Fowler", "content_type": "article"},
        {"title": "ByteByteGo System Design", "url": "https://bytebytego.com", "source": "ByteByteGo", "content_type": "article"},
        {"title": "MIT OpenCourseWare — Computer Science", "url": "https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/", "source": "MIT OCW", "content_type": "course"},
        {"title": "ACM Queue — Research for Practitioners", "url": "https://queue.acm.org", "source": "ACM", "content_type": "paper"},
    ],
    "finance": [
        {"title": "Brookings Institution — Economic Analysis", "url": "https://www.brookings.edu/topic/economic-studies/", "source": "Brookings", "content_type": "paper"},
        {"title": "NBER Working Papers", "url": "https://www.nber.org/papers", "source": "NBER", "content_type": "paper"},
        {"title": "Matt Levine's Money Stuff", "url": "https://www.bloomberg.com/opinion/authors/ARbTQlRLRjE/matthew-s-levine", "source": "Bloomberg", "content_type": "article"},
        {"title": "Ray Dalio's Principles", "url": "https://www.principles.com", "source": "Bridgewater", "content_type": "book"},
        {"title": "IMF Blog — Global Economy", "url": "https://www.imf.org/en/Blogs", "source": "IMF", "content_type": "article"},
        {"title": "Federal Reserve Economic Data (FRED)", "url": "https://fred.stlouisfed.org", "source": "St. Louis Fed", "content_type": "article"},
    ],
    "health": [
        {"title": "Huberman Lab Podcast", "url": "https://hubermanlab.com", "source": "Andrew Huberman", "content_type": "podcast"},
        {"title": "Examine.com — Evidence-Based Nutrition", "url": "https://examine.com", "source": "Examine", "content_type": "article"},
        {"title": "Stronger By Science", "url": "https://www.strongerbyscience.com", "source": "SBS", "content_type": "article"},
        {"title": "Peter Attia's The Drive", "url": "https://peterattiamd.com", "source": "Peter Attia", "content_type": "podcast"},
    ],
    "productivity": [
        {"title": "Cal Newport's Blog", "url": "https://calnewport.com/blog/", "source": "Cal Newport", "content_type": "article"},
        {"title": "James Clear's 3-2-1 Newsletter", "url": "https://jamesclear.com/3-2-1", "source": "James Clear", "content_type": "article"},
        {"title": "Learning How to Learn (Coursera)", "url": "https://www.coursera.org/learn/learning-how-to-learn", "source": "Coursera / Dr. Oakley", "content_type": "course"},
        {"title": "Tim Ferriss Show — Routines of Top Performers", "url": "https://tim.blog/podcast/", "source": "Tim Ferriss", "content_type": "podcast"},
    ],
}

# Map goal types to reading categories
GOAL_TYPE_TO_CATEGORY: dict[str, str] = {
    "learn": "tech",
    "build": "tech",
    "habit": "productivity",
    "fitness": "health",
}


# ── Routes ──────────────────────────────────────────────────
@router.get("/", response_model=ReadingsPublic)
def read_readings(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    category: str | None = None,
    bookmarked_only: bool = False,
) -> Any:
    """Get user's saved readings with optional filters."""
    conditions = [Reading.owner_id == current_user.id]
    if category:
        conditions.append(Reading.category == category)
    if bookmarked_only:
        conditions.append(Reading.is_bookmarked == True)

    count_statement = select(func.count()).select_from(Reading).where(*conditions)
    count = session.exec(count_statement).one()

    statement = (
        select(Reading)
        .where(*conditions)
        .order_by(col(Reading.created_at).desc())
        .offset(skip)
        .limit(limit)
    )
    readings = session.exec(statement).all()
    return ReadingsPublic(data=readings, count=count)


@router.post("/", response_model=ReadingPublic)
def create_reading(
    *, session: SessionDep, current_user: CurrentUser, reading_in: ReadingCreate
) -> Any:
    """Save a new article/reading to the user's library."""
    reading = Reading(**reading_in.model_dump(), owner_id=current_user.id)
    session.add(reading)
    session.commit()
    session.refresh(reading)
    return reading


@router.put("/{id}", response_model=ReadingPublic)
def update_reading(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, reading_in: ReadingUpdate
) -> Any:
    """Update a reading (bookmark, mark as read, etc.)."""
    reading = session.get(Reading, id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    if reading.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    for field, value in reading_in.model_dump(exclude_unset=True).items():
        setattr(reading, field, value)

    session.add(reading)
    session.commit()
    session.refresh(reading)
    return reading


@router.delete("/{id}", response_model=Message)
def delete_reading(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """Remove a reading from the user's library."""
    reading = session.get(Reading, id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    if reading.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    session.delete(reading)
    session.commit()
    return Message(message="Reading deleted successfully")


@router.get("/suggestions")
def get_reading_suggestions(
    current_user: CurrentUser,
    goal_types: str | None = None,  # comma-separated: "learn,build,fitness"
) -> Any:
    """
    Get suggested articles based on the user's goal types.
    If no goal_types provided, return suggestions for all categories.
    """
    categories = set()
    if goal_types:
        for gt in goal_types.split(","):
            gt = gt.strip().lower()
            cat = GOAL_TYPE_TO_CATEGORY.get(gt, "productivity")
            categories.add(cat)
    else:
        categories = set(SUGGESTED_ARTICLES.keys())

    suggestions: list[dict] = []
    for cat in categories:
        for article in SUGGESTED_ARTICLES.get(cat, []):
            suggestions.append({**article, "category": cat})

    return {"suggestions": suggestions, "categories": sorted(categories)}
