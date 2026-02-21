import logging
import sys
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
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
            
            # SANITY CHECK: Robust Schema & Table discovery
            from sqlalchemy import text
            try:
                with Session(engine) as session:
                    # 1. Check current schema
                    current_schema = session.exec(text("SELECT current_schema()")).first()
                    # 2. List all tables across all schemas (excluding system schemas)
                    all_tables = session.exec(text("SELECT schema_name, table_name FROM information_schema.tables WHERE table_schema NOT IN ('information_schema', 'pg_catalog')")).all()
                    # 3. Check for alembic_version specifically
                    try:
                        rev = session.exec(text("SELECT version_num FROM alembic_version")).first()
                    except:
                        rev = "NOT FOUND"
                    
                    logger.info(f"Verification: Current Schema={current_schema}, Alembic Revision={rev}")
                    logger.info(f"Verification: Found {len(all_tables)} total tables: {all_tables}")
            except Exception as ve:
                logger.warning(f"Sanity check failed (but migrations might have worked): {ve}")
            
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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    """Simple health check endpoint for Render/deployment monitoring."""
    return {"status": "ok", "environment": settings.ENVIRONMENT}
