import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, ReadingServiceDep
from app.models.reading import (
    ReadingCreate,
    ReadingPublic,
    ReadingsPublic,
    ReadingUpdate,
    ReadingInsightCreate,
    ReadingInsightPublic,
    ReadingInsightsPublic,
)
from app.models.core import Message

router = APIRouter(prefix="/readings", tags=["readings"])


# ── Routes ──────────────────────────────────────────────────
@router.get("/", response_model=ReadingsPublic)
def read_readings(
    reading_service: ReadingServiceDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    category: str | None = None,
    bookmarked_only: bool = False,
) -> Any:
    """Get user's saved readings with optional filters."""
    readings, count = reading_service.get_readings(
        user=current_user,
        skip=skip,
        limit=limit,
        category=category,
        bookmarked_only=bookmarked_only
    )
    return ReadingsPublic(data=readings, count=count)


@router.post("/", response_model=ReadingPublic)
def create_reading(
    *, reading_service: ReadingServiceDep, current_user: CurrentUser, reading_in: ReadingCreate
) -> Any:
    """Save a new article/reading to the user's library."""
    reading = reading_service.create_reading(reading_in=reading_in, user=current_user)
    return reading


@router.put("/{id}", response_model=ReadingPublic)
def update_reading(
    *, reading_service: ReadingServiceDep, current_user: CurrentUser, id: uuid.UUID, reading_in: ReadingUpdate
) -> Any:
    """Update a reading (bookmark, mark as read, etc.)."""
    try:
        reading = reading_service.update_reading(id=id, reading_in=reading_in, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
        
    return reading


@router.delete("/{id}", response_model=Message)
def delete_reading(
    reading_service: ReadingServiceDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """Remove a reading from the user's library."""
    try:
        success = reading_service.delete_reading(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not success:
        raise HTTPException(status_code=404, detail="Reading not found")
        
    return Message(message="Reading deleted successfully")


@router.get("/suggestions")
def get_reading_suggestions(
    reading_service: ReadingServiceDep,
    current_user: CurrentUser,
    goal_types: str | None = None,  # comma-separated: "learn,build,fitness"
) -> Any:
    """
    Get suggested articles based on the user's goal types.
    If no goal_types provided, return suggestions for all categories.
    """
    return reading_service.get_suggestions(goal_types=goal_types)


# ── Reading Insights ────────────────────────────────────────

@router.get("/insights", response_model=ReadingInsightsPublic)
def read_reading_insights(
    reading_service: ReadingServiceDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get user's extracted reading insights/summaries."""
    insights, count = reading_service.get_insights(user=current_user, skip=skip, limit=limit)
    return ReadingInsightsPublic(data=insights, count=count)


@router.post("/insights/generate", response_model=ReadingInsightsPublic)
async def generate_reading_insights(
    reading_service: ReadingServiceDep,
    current_user: CurrentUser,
) -> Any:
    """Trigger AI generation of fresh reading insights based on user goals."""
    insights = await reading_service.generate_fresh_insights(user=current_user)
    return ReadingInsightsPublic(data=insights, count=len(insights))


@router.post("/insights", response_model=ReadingInsightPublic)
def create_reading_insight(
    *, reading_service: ReadingServiceDep, current_user: CurrentUser, insight_in: ReadingInsightCreate
) -> Any:
    """Save a new AI-extracted reading insight to the user's library."""
    insight = reading_service.create_insight(insight_in=insight_in, user=current_user)
    return insight


@router.delete("/insights/{id}", response_model=Message)
def delete_reading_insight(
    reading_service: ReadingServiceDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """Remove a reading insight from the user's library."""
    try:
        success = reading_service.delete_insight(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not success:
        raise HTTPException(status_code=404, detail="Insight not found")
        
    return Message(message="Insight deleted successfully")
