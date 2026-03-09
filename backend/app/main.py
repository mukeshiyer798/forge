import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.tasks.email_scheduler import start_email_scheduler, stop_email_scheduler
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.rate_limit import limiter
from app.core.idempotency_middleware import IdempotencyMiddleware
from app.middleware.request_logging import RequestLoggingMiddleware

# ── 1. Structured logging (must be first) ──
setup_logging(level=settings.LOG_LEVEL)
logger = get_logger(__name__)

# ── 2. Cleanup (api_router is already imported) ──
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("app.startup", extra={"environment": settings.ENVIRONMENT, "version": settings.APP_VERSION})

    # Database migrations and initial data are now handled by a pre-deploy script
    # to avoid race conditions with multiple worker processes.

    start_email_scheduler()
    yield
    logger.info("app.shutdown")
    stop_email_scheduler()


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


from fastapi.responses import ORJSONResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENVIRONMENT != "production" else None,
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
    default_response_class=ORJSONResponse,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Set all CORS enabled origins
if settings.all_cors_origins:
    origins = [str(origin).rstrip("/") for origin in settings.all_cors_origins]
    # Remove any '*' from the list if allow_credentials is True to avoid Starlette errors
    if "*" in origins:
        origins.remove("*")

    logger.info("cors.setup", extra={"origins": origins})
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "Accept",
            "Idempotency-Key",
            "x-session-id",
            "x-request-id",
            "Accept-Language",
            "Range",
            "Origin",
        ],
        expose_headers=["x-request-id"],
    )

app.add_middleware(IdempotencyMiddleware)
app.add_middleware(RequestLoggingMiddleware)

from fastapi import HTTPException
from fastapi.responses import ORJSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code in [401, 403]:
        logger.warning("auth.error", extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "detail": exc.detail,
        })
    return ORJSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    """Root endpoint to handle default health checks."""
    return {
        "message": "Welcome to the Forge API",
        "status": "ok",
        "version": settings.APP_VERSION
    }

@app.get("/health", tags=["system"])
@app.get("/healthz", tags=["system"])
def health_check() -> dict[str, str]:
    """Health check endpoint for deployment monitoring."""
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "version": settings.APP_VERSION,
    }
