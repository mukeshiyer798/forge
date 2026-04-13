from fastapi import APIRouter

from app.api.routes import (
    email_preferences,
    items,
    login,
    private,
    users,
    utils,
    goals,
    pomodoro,
    spaced_repetition,
    readings,
    ai,
    wisdom,
    debug,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(goals.router)
api_router.include_router(pomodoro.router)
api_router.include_router(spaced_repetition.router)
api_router.include_router(email_preferences.router)
api_router.include_router(readings.router)
api_router.include_router(ai.router)
api_router.include_router(wisdom.router)
api_router.include_router(debug.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
