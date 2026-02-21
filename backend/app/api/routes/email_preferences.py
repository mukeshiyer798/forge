"""Email preferences API - get/update daily plan email settings."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, SessionDep
from app.models import UserUpdateMe

router = APIRouter(prefix="/email-preferences", tags=["email-preferences"])


@router.get("")
def get_email_preferences(current_user: CurrentUser) -> dict:
    """Get current user's email preferences."""
    return {
        "email_daily_plan_enabled": current_user.email_daily_plan_enabled,
        "email_morning_time": current_user.email_morning_time,
        "email_afternoon_time": current_user.email_afternoon_time,
        "email_evening_time": current_user.email_evening_time,
        "timezone": current_user.timezone,
    }


@router.put("", response_model=dict)
def update_email_preferences(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    user_in: UserUpdateMe,
) -> dict:
    """Update email preferences. Only provided fields are updated."""
    update_data = user_in.model_dump(exclude_unset=True)
    allowed = {
        "email_daily_plan_enabled",
        "email_morning_time",
        "email_afternoon_time",
        "email_evening_time",
        "timezone",
        "greeting_preference",
        "status_message",
    }
    filtered = {k: v for k, v in update_data.items() if k in allowed}
    if filtered:
        current_user.sqlmodel_update(filtered)
        session.add(current_user)
        session.commit()
        session.refresh(current_user)
    return get_email_preferences(current_user)
