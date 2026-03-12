from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session

from app.core import security
from app.core.config import settings
from app.core.db import engine
from app.core.logging import get_logger, user_id_ctx
from app.models.core import TokenPayload
from app.entities.user import User
from app.repositories.user_repository import UserRepository
from app.repositories.item_repository import ItemRepository
from app.repositories.goal_repository import GoalRepository
from app.repositories.pomodoro_repository import PomodoroRepository
from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
from app.repositories.reading_repository import ReadingRepository
from app.repositories.wisdom_repository import WisdomRepository
from app.services.user_service import UserService
from app.services.item_service import ItemService
from app.services.goal_service import GoalService
from app.services.pomodoro_service import PomodoroService
from app.services.spaced_repetition_service import SpacedRepetitionService
from app.services.reading_service import ReadingService
from app.services.wisdom_service import WisdomService
from app.services.ai_service import AiService

from clerk_backend_api import Clerk
from clerk_backend_api.models import SDKError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = get_logger(__name__)

clerk_client = Clerk(bearer_auth=settings.CLERK_SECRET_KEY)
bearer_scheme = HTTPBearer()

# Performance Optimization: Cache Clerk API responses to avoid repeated hits per request
# In a production environment with multiple workers, a Redis cache would be better.
# For local dev, a simple dict is sufficient.
clerk_profile_cache = {} # clerk_id -> email

def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_db)]

def get_token(auth: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)]) -> str:
    return auth.credentials

TokenDep = Annotated[str, Depends(get_token)]

def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        # Clerk JWTs are RS256 and signed by Clerk's JWKS or Public Key.
        
        # 1. Verify and Decode Token using cached JWKS
        try:
            # Use provided URL from settings if available, otherwise typical Clerk format
            # e.g. "https://clerk.yourdomain.com/.well-known/jwks.json" or "https://api.clerk.com/v1/jwks"
            clerk_domain = settings.CLERK_PUBLISHABLE_KEY.replace('pk_test_', '').replace('pk_live_', '').split('$')[0] if settings.CLERK_PUBLISHABLE_KEY else ""
            
            # The standard frontend-facing JWKS URL for Clerk 
            jwks_url = f"https://{clerk_domain}/.well-known/jwks.json" if clerk_domain else "https://api.clerk.com/v1/jwks"

            from functools import lru_cache
            from jwt import PyJWKClient

            @lru_cache(maxsize=1)
            def get_jwks_client(url: str):
                return PyJWKClient(url, cache_keys=True)
            
            # Fetch the cached signing key for this specific token's header
            jwks_client = get_jwks_client(jwks_url)
            signing_key = jwks_client.get_signing_key_from_jwt(token)

            session_claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                # Standard Clerk claims
                options={"verify_exp": True, "verify_aud": False}, 
            )
            logger.debug("auth.jwt.decoded_success", extra={"keys": list(session_claims.keys())})
        except jwt.ExpiredSignatureError:
            logger.warning("auth.jwt.token_expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has expired",
            )
        except Exception as jwt_err:
            logger.warning("auth.jwt.decode_failed", extra={
                "error": str(jwt_err),
                "token_preview": token[:20] + "..." if token else "None"
            })
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid session token: {str(jwt_err)}",
            )

        if not session_claims:
            logger.warning("auth.clerk.invalid_session", extra={"reason": "empty_claims"})
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Clerk session",
            )

        clerk_id = session_claims.get("sub")
        # Clerk tokens typically have 'email' or we can get it from the user API
        email = session_claims.get("email") or session_claims.get("email_address")

        # Fallback: Fetch email from Clerk API if missing from JWT
        if not email and clerk_id:
            # Check cache first
            if clerk_id in clerk_profile_cache:
                email = clerk_profile_cache[clerk_id]
                logger.debug("auth.clerk.cache_hit", extra={"clerk_id": clerk_id, "email": email})
            else:
                logger.info("auth.clerk.fetching_email", extra={"clerk_id": clerk_id})
                try:
                    import httpx
                    headers = {
                        "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                        "Content-Type": "application/json",
                    }
                    # Sync request to keep get_current_user synchronous
                    with httpx.Client(timeout=5.0) as client:
                        response = client.get(f"https://api.clerk.com/v1/users/{clerk_id}", headers=headers)
                        if response.status_code == 200:
                            clerk_data = response.json()
                            email_addresses = clerk_data.get("email_addresses", [])
                            if email_addresses:
                                email = email_addresses[0].get("email_address")
                                # Store in cache
                                clerk_profile_cache[clerk_id] = email
                                logger.info("auth.clerk.email_fetched", extra={"clerk_id": clerk_id, "email": email})
                            else:
                                logger.warning("auth.clerk.no_email_found", extra={"clerk_id": clerk_id})
                        else:
                            logger.warning("auth.clerk.api_fetch_failed", extra={
                                "clerk_id": clerk_id,
                                "status_code": response.status_code,
                                "error": response.text[:200]
                            })
                except Exception as fetch_err:
                    logger.error("auth.clerk.fetch_exception", extra={"error": str(fetch_err)})

    except HTTPException:
        raise
    except Exception as e:
        logger.warning("auth.clerk.generic_failure", extra={
            "error_type": type(e).__name__,
            "error": str(e)[:200],
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {type(e).__name__}",
        )

    # 1. Try to find user by clerk_id
    from sqlmodel import select
    user = session.exec(select(User).where(User.clerk_id == clerk_id)).first()

    # 2. Fallback: Find by email (for migration from legacy)
    if not user and email:
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            # Link legacy user to Clerk
            user.clerk_id = clerk_id
            session.add(user)
            session.commit()
            session.refresh(user)
            logger.info("auth.clerk.legacy_user_linked", extra={
                "user_id": str(user.id),
                "clerk_id": clerk_id,
            })

    # 3. JIT Provisioning: Create user if still not found
    if not user:
        if not email:
            logger.error("auth.user.provisioning_failed", extra={
                "clerk_id": clerk_id,
                "reason": "missing_email"
            })
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address not provided by identity provider",
            )

        logger.info("auth.user.provisioning", extra={
            "clerk_id": clerk_id,
            "email_domain": email.split("@")[-1] if email else "unknown",
        })
        user = User(
            email=email,
            clerk_id=clerk_id,
            full_name=session_claims.get("name") or session_claims.get("full_name") or "New User",
            is_active=True,
            is_superuser=False,
            hashed_password="CLERK_AUTH_MANAGED"
        )
        try:
            session.add(user)
            session.commit()
            session.refresh(user)
            logger.info("auth.user.provisioned", extra={"user_id": str(user.id)})
        except Exception as db_err:
            session.rollback()
            logger.error("auth.user.provisioning_db_failed", extra={
                "error": str(db_err),
                "clerk_id": clerk_id,
                "email": email
            })
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create user account: {str(db_err)}"
            )

    if not user.is_active:
        logger.warning("auth.user.inactive", extra={"user_id": str(user.id)})
        raise HTTPException(status_code=400, detail="Inactive user")

    # Set user context for downstream loggers
    user_id_ctx.set(str(user.id))

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
        logger.warning("auth.superuser.denied", extra={"user_id": str(current_user.id)})
        raise HTTPException(
            status_code=403, detail="The user doesn't have enough privileges"
        )
    return current_user

def get_user_service(session: SessionDep) -> UserService:
    repo = UserRepository(session)
    return UserService(repo)

def get_item_service(session: SessionDep) -> ItemService:
    repo = ItemRepository(session)
    return ItemService(repo)

def get_goal_service(session: SessionDep) -> GoalService:
    repo = GoalRepository(session)
    return GoalService(repo)

def get_pomodoro_service(session: SessionDep) -> PomodoroService:
    repo = PomodoroRepository(session)
    goal_repo = GoalRepository(session)
    return PomodoroService(repo, goal_repo)

def get_spaced_repetition_service(session: SessionDep) -> SpacedRepetitionService:
    repo = SpacedRepetitionRepository(session)
    goal_repo = GoalRepository(session)
    return SpacedRepetitionService(repo, goal_repo)

def get_ai_service() -> AiService:
    return AiService()

def get_reading_service(session: SessionDep, ai_service: AiService = Depends(get_ai_service)) -> ReadingService:
    repo = ReadingRepository(session)
    return ReadingService(repo=repo, ai_service=ai_service)

def get_wisdom_service(session: SessionDep, ai_service: AiService = Depends(get_ai_service)) -> WisdomService:
    repo = WisdomRepository(session)
    return WisdomService(repo=repo, ai_service=ai_service)

UserServiceDep = Annotated[UserService, Depends(get_user_service)]
ItemServiceDep = Annotated[ItemService, Depends(get_item_service)]
GoalServiceDep = Annotated[GoalService, Depends(get_goal_service)]
PomodoroServiceDep = Annotated[PomodoroService, Depends(get_pomodoro_service)]
SpacedRepetitionServiceDep = Annotated[SpacedRepetitionService, Depends(get_spaced_repetition_service)]
AiServiceDep = Annotated[AiService, Depends(get_ai_service)]
ReadingServiceDep = Annotated[ReadingService, Depends(get_reading_service)]
WisdomServiceDep = Annotated[WisdomService, Depends(get_wisdom_service)]
