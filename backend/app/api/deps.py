from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import Session, select

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

logger = get_logger(__name__)

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[str, Depends(reusable_oauth2)]


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    user = session.exec(select(User).where(User.id == token_data.sub)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Set user context for logging
    user_id_ctx.set(str(user.id))
    
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_current_active_superuser(current_user: CurrentUser) -> User:
    if not current_user.is_superuser:
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


def get_reading_service(session: SessionDep) -> ReadingService:
    repo = ReadingRepository(session)
    ai_service = AiService()
    return ReadingService(repo, ai_service)


def get_ai_service() -> AiService:
    return AiService()


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
