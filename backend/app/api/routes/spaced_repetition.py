import uuid

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, SpacedRepetitionServiceDep, AiServiceDep
from app.core.logging import get_logger
from app.models.spaced_repetition import (
    SpacedRepetitionItemCreate,
    SpacedRepetitionItemPublic,
    SpacedRepetitionItemsPublic,
    SpacedRepetitionReview,
)

logger = get_logger("routes.spaced_repetition")

router = APIRouter(prefix="/spaced-repetition", tags=["spaced-repetition"])


@router.get("/due", response_model=SpacedRepetitionItemsPublic)
def get_due_items(
    spaced_repetition_service: SpacedRepetitionServiceDep,
    current_user: CurrentUser,
) -> SpacedRepetitionItemsPublic:
    """Get spaced repetition items due for review today."""
    items = spaced_repetition_service.get_due_items(user=current_user)
    return SpacedRepetitionItemsPublic(data=items, count=len(items))


@router.post("/items", response_model=SpacedRepetitionItemPublic)
def create_spaced_repetition_item(
    *,
    spaced_repetition_service: SpacedRepetitionServiceDep,
    current_user: CurrentUser,
    item_in: SpacedRepetitionItemCreate,
) -> SpacedRepetitionItemPublic:
    """Create a new spaced repetition item (e.g. when topic is completed)."""
    try:
        item = spaced_repetition_service.create(item_in=item_in, user=current_user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
        
    return item


@router.post("/review/{id}", response_model=SpacedRepetitionItemPublic)
def submit_review(
    *,
    spaced_repetition_service: SpacedRepetitionServiceDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    review: SpacedRepetitionReview,
) -> SpacedRepetitionItemPublic:
    """Submit a review (correct/incorrect) and schedule next review."""
    try:
        item = spaced_repetition_service.submit_review(id=id, review=review, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    return item


@router.get("/prompt/{id}")
def get_review_prompt(
    spaced_repetition_service: SpacedRepetitionServiceDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> dict:
    """Generate a copyable review prompt for the spaced repetition item."""
    try:
        result = spaced_repetition_service.get_review_prompt(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
        
    prompt, topic_name = result
    return {"prompt": prompt, "topic_name": topic_name}


@router.post("/generate-explanation/{id}")
async def generate_explanation(
    spaced_repetition_service: SpacedRepetitionServiceDep,
    ai_service: AiServiceDep,
    current_user: CurrentUser,
    id: uuid.UUID,
) -> dict:
    """Generate a detailed explanation of the spaced repetition item using AI."""
    logger.info("route.sr.generate_explanation.started", extra={
        "user_id": str(current_user.id),
        "item_id": str(id),
    })
    try:
        result = spaced_repetition_service.get_review_prompt(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not result:
        raise HTTPException(status_code=404, detail="Item not found")
        
    _, topic_name = result
    
    # We retrieve the item strictly to pass context to the AI
    item = spaced_repetition_service.get_item(id, current_user)
    
    from app.prompts.spaced_repetition import build_explanation_prompt
    prompt = build_explanation_prompt(item)
    
    try:
        response = await ai_service.generate_response(prompt, current_user)
        # response may be a dict with 'explanation' or just a raw string, we adapt:
        explanation = response.get("explanation", "") if isinstance(response, dict) else str(response)
        return {"explanation": explanation}
    except Exception as e:
        logger.error("route.sr.generate_explanation.failed", extra={
            "user_id": str(current_user.id),
            "item_id": str(id),
            "error": str(e)[:200],
        })
        raise HTTPException(status_code=500, detail=str(e))
