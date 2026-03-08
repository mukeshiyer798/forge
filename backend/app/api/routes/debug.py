"""Debug routes for observability verification."""

import sentry_sdk
from fastapi import APIRouter, Depends

from app.api.deps import get_current_active_superuser
from app.core.config import settings
from app.core.logging import get_logger

router = APIRouter(prefix="/debug", tags=["debug"])
logger = get_logger(__name__)


@router.get("/health")
def debug_health() -> dict:
    """Extended health check with version and config info."""
    logger.info("debug.health_check")
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "version": settings.APP_VERSION,
        "log_level": settings.LOG_LEVEL,
    }
