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

# ── 2. Alembic (after logging, before app) ──

from alembic import command
from alembic.config import Config
from app import initial_data
from app.api.main import api_router
from app.core.db import engine, Session

import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("app.startup", extra={"environment": settings.ENVIRONMENT, "version": settings.APP_VERSION})

    # Run database migrations and initial data automatically
    if settings.ENVIRONMENT != "local":
        try:
            logger.info("db.migrations.starting")
            # Calculate absolute path to alembic.ini (it's in the backend root)
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            alembic_ini_path = os.path.join(project_root, "alembic.ini")

            # Log the connection target (masking password)
            logger.info("db.connecting", extra={
                "host": settings.POSTGRES_SERVER,
                "database": settings.POSTGRES_DB,
                "user": settings.POSTGRES_USER,
            })

            alembic_cfg = Config(alembic_ini_path)

            # Formulate the absolute path for the migrations folder (backend/app/alembic)
            alembic_scripts_path = os.path.join(project_root, "app", "alembic")
            logger.info("db.alembic_scripts", extra={"path": alembic_scripts_path})
            alembic_cfg.set_main_option("script_location", alembic_scripts_path)

            logger.info("db.migrations.executing")
            command.upgrade(alembic_cfg, "head")
            logger.info("db.migrations.completed")

            # SANITY CHECK: Basic confirmation of table creation
            from sqlalchemy import text
            with Session(engine) as session:
                table_count = session.exec(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")).first()
                logger.info("db.verification", extra={"table_count": table_count})

            logger.info("db.initial_data.starting")
            initial_data.init()
            logger.info("db.initial_data.completed")
        except Exception as e:
            logger.error("db.initialization.failed", exc_info=True)
            raise e  # Force the deployment to fail if migrations cannot run!

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
        allow_headers=["Authorization", "Content-Type", "Accept", "Idempotency-Key", "x-session-id"],
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

@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Health check endpoint for deployment monitoring."""
    return {
        "status": "ok",
        "environment": settings.ENVIRONMENT,
        "version": settings.APP_VERSION,
    }
