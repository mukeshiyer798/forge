from fastapi import APIRouter
from app.api.deps import CurrentUser, WisdomServiceDep
from app.models.wisdom import WisdomsPublic
from app.core.logging import get_logger

logger = get_logger("routes.wisdom")

router = APIRouter(prefix="/wisdom", tags=["wisdom"])

@router.get("/mindset", response_model=WisdomsPublic)
async def get_mindset_wisdoms(
    wisdom_service: WisdomServiceDep,
    current_user: CurrentUser,
    limit: int = 3
) -> WisdomsPublic:
    """Fetch universally cached self-improvement mindsets and quotes."""
    wisdoms = await wisdom_service.get_universal_wisdoms(limit=limit, user=current_user)
    return WisdomsPublic(data=wisdoms, count=len(wisdoms))
