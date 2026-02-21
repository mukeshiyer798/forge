import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Goal,
    SpacedRepetitionItem,
    SpacedRepetitionItemCreate,
    SpacedRepetitionItemPublic,
    SpacedRepetitionItemsPublic,
    SpacedRepetitionReview,
)
from app.utils.prompt_generator import generate_review_prompt
from app.utils.spaced_repetition import calculate_next_interval

router = APIRouter(prefix="/spaced-repetition", tags=["spaced-repetition"])


@router.get("/due", response_model=SpacedRepetitionItemsPublic)
def get_due_items(
    session: SessionDep,
    current_user: CurrentUser,
) -> SpacedRepetitionItemsPublic:
    """Get spaced repetition items due for review today."""
    now = datetime.now(timezone.utc)
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    statement = (
        select(SpacedRepetitionItem)
        .where(SpacedRepetitionItem.owner_id == current_user.id)
        .where(SpacedRepetitionItem.next_review_at <= end_of_day)
        .order_by(SpacedRepetitionItem.next_review_at.asc())
    )
    items = list(session.exec(statement).all())
    return SpacedRepetitionItemsPublic(data=items, count=len(items))


@router.post("/items", response_model=SpacedRepetitionItemPublic)
def create_spaced_repetition_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    item_in: SpacedRepetitionItemCreate,
) -> SpacedRepetitionItemPublic:
    """Create a new spaced repetition item (e.g. when topic is completed)."""
    goal = session.get(Goal, item_in.goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    # First review in 1 day
    next_review = datetime.now(timezone.utc) + timedelta(days=1)

    db_item = SpacedRepetitionItem(
        owner_id=current_user.id,
        goal_id=item_in.goal_id,
        topic_id=item_in.topic_id,
        topic_name=item_in.topic_name,
        active_recall_question=item_in.active_recall_question,
        resources=item_in.resources,
        next_review_at=next_review,
    )
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


@router.post("/review/{id}", response_model=SpacedRepetitionItemPublic)
def submit_review(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    review: SpacedRepetitionReview,
) -> SpacedRepetitionItemPublic:
    """Submit a review (correct/incorrect) and schedule next review."""
    item = session.get(SpacedRepetitionItem, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    next_interval, new_ease = calculate_next_interval(
        correct=review.correct,
        current_interval_days=item.interval_days,
        ease_factor=item.ease_factor,
        consecutive_correct=item.consecutive_correct,
        review_count=item.review_count,
    )

    now = datetime.now(timezone.utc)
    next_review = now + timedelta(days=next_interval)

    item.last_reviewed_at = now
    item.next_review_at = next_review
    item.ease_factor = new_ease
    item.interval_days = next_interval
    item.review_count += 1
    if review.correct:
        item.consecutive_correct += 1
    else:
        item.consecutive_correct = 0

    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.get("/prompt/{id}")
def get_review_prompt(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> dict:
    """Generate a copyable review prompt for the spaced repetition item."""
    item = session.get(SpacedRepetitionItem, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    prompt = generate_review_prompt(
        topic_name=item.topic_name,
        resources=item.resources,
        active_recall_question=item.active_recall_question,
    )
    return {"prompt": prompt, "topic_name": item.topic_name}
