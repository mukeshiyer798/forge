import logging
import sys
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.tasks.email_scheduler import start_email_scheduler, stop_email_scheduler
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.rate_limit import limiter

# Configure native logging for stdout (Render captures this automatically)
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

from alembic import command
from alembic.config import Config
from app import initial_data
from app.api.main import api_router
from app.core.db import engine, Session

import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application starting up...")
    
    # Run database migrations and initial data automatically
    if settings.ENVIRONMENT != "local":
        try:
            logger.info("Running database migrations...")
            # Calculate absolute path to alembic.ini (it's in the backend root)
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            alembic_ini_path = os.path.join(project_root, "alembic.ini")
            
            # Log the connection target (masking password)
            db_host = settings.POSTGRES_SERVER
            db_name = settings.POSTGRES_DB
            db_user = settings.POSTGRES_USER
            logger.info(f"Connecting to database: {db_name} as {db_user} at {db_host}")
            
            alembic_cfg = Config(alembic_ini_path)
            
            # Formulate the absolute path for the migrations folder (backend/app/alembic)
            alembic_scripts_path = os.path.join(project_root, "app", "alembic")
            logger.info(f"Using Alembic scripts at: {alembic_scripts_path}")
            alembic_cfg.set_main_option("script_location", alembic_scripts_path)
            
            logger.info("Executing alembic upgrade head...")
            command.upgrade(alembic_cfg, "head")
            logger.info("Database migrations completed successfully.")
            
            # SANITY CHECK: Basic confirmation of table creation
            from sqlalchemy import text
            with Session(engine) as session:
                table_count = session.exec(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")).first()
                logger.info(f"Verification: Found {table_count} tables in public schema.")
            
            logger.info("Ensuring initial data (superuser)...")
            initial_data.init()
            logger.info("Initial data check completed.")
        except Exception as e:
            logger.error(f"Error during database initialization: {e}", exc_info=True)

    start_email_scheduler()
    yield
    logger.info("Application shutting down...")
    stop_email_scheduler()


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
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
    
    logger.info(f"Setting up CORS with origins: {origins}")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        # Liberal regex for Vercel previews - handles dots correctly
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

from fastapi import HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Log the exact source of 401/403 errors to find the "Not authenticated" trigger
    if exc.status_code in [401, 403]:
        logger.warning(f"Auth Error {exc.status_code} at {request.url.path}: {exc.detail}")
        # Log headers to see if something unexpected is being sent
        logger.debug(f"Request Headers: {dict(request.headers)}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Simple health check endpoint for Render/deployment monitoring."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}
