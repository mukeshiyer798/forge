"""Email preferences API - get/update daily plan email settings."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, UserServiceDep
from app.models import UserUpdateMe
from app.core.logging import get_logger

logger = get_logger("routes.email_preferences")

router = APIRouter(prefix="/email-preferences", tags=["email-preferences"])


@router.get("")
def get_email_preferences(current_user: CurrentUser) -> dict:
    """Get current user's email preferences."""
    return {
        "email_daily_plan_enabled": current_user.email_daily_plan_enabled,
        "email_frequency": current_user.email_frequency,
        "email_morning_time": current_user.email_morning_time,
        "timezone": current_user.timezone,
    }


@router.put("", response_model=dict)
def update_email_preferences(
    *,
    user_service: UserServiceDep,
    current_user: CurrentUser,
    user_in: UserUpdateMe,
) -> dict:
    """Update email preferences. Only provided fields are updated."""
    updated_user = user_service.update_me(db_user=current_user, user_in=user_in)
    return get_email_preferences(updated_user)
