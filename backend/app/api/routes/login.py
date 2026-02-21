from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser, UserServiceDep
from app.core import security
from app.core.config import settings
from app.models.core import Message, NewPassword, Token
from app.models.user import UserPublic
from app.core.rate_limit import limiter

router = APIRouter(tags=["login"])


@router.post("/login/access-token")
@limiter.limit("5/minute")
def login_access_token(
    request: Request,
    user_service: UserServiceDep, 
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = user_service.authenticate(email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )

@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user

@router.post("/login/refresh-token")
def refresh_token(current_user: CurrentUser) -> Token:
    """
    Refresh/rotate an access token.
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            current_user.id, expires_delta=access_token_expires
        )
    )

@router.post("/password-recovery/{email}")
@limiter.limit("5/minute")
def recover_password(request: Request, email: str, user_service: UserServiceDep) -> Message:
    """
    Password Recovery
    """
    user_service.recover_password(email=email)
    return Message(
        message="If that email is registered, we sent a password recovery link"
    )


@router.post("/reset-password/")
@limiter.limit("5/minute")
def reset_password(request: Request, user_service: UserServiceDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    success = user_service.reset_password(token=body.token, new_password=body.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid token or inactive user")
    return Message(message="Password updated successfully")


@router.post(
    "/password-recovery-html-content/{email}",
    dependencies=[Depends(get_current_active_superuser)],
    response_class=HTMLResponse,
)
def recover_password_html_content(email: str, user_service: UserServiceDep) -> Any:
    """
    HTML Content for Password Recovery
    """
    email_data = user_service.generate_password_recovery_html(email=email)
    if not email_data:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    
    html_content, subject = email_data
    return HTMLResponse(
        content=html_content, headers={"subject:": subject}
    )
