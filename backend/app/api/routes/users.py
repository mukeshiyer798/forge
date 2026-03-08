import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.deps import (
    CurrentUser,
    SessionDep,
    get_current_active_superuser,
    UserServiceDep
)
from app.core.rate_limit import limiter
from app.core.logging import get_logger
from app.models import (
    Message,
    UpdatePassword,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserCreate,
    UserUpdateMe,
    UserUpdate
)

logger = get_logger("routes.users")

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", dependencies=[Depends(get_current_active_superuser)], response_model=UsersPublic)
def read_users(user_service: UserServiceDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve users.
    """
    users, count = user_service.get_all(skip=skip, limit=limit)
    return UsersPublic(data=users, count=count)

@router.post("/", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic)
def create_user(*, user_service: UserServiceDep, user_in: UserCreate) -> Any:
    """
    Create new user.
    """
    user = user_service.get_by_email(email=user_in.email)
    if user:
        raise HTTPException(status_code=400, detail="The user with this email already exists in the system.")
    user = user_service.create(user_create=user_in)
    return user

@router.patch("/me", response_model=UserPublic)
def update_user_me(*, user_service: UserServiceDep, user_in: UserUpdateMe, current_user: CurrentUser) -> Any:
    """
    Update own user.
    """
    if user_in.email:
        existing_user = user_service.get_by_email(email=user_in.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=409, detail="User with this email already exists")
    updated_user = user_service.update_me(db_user=current_user, user_in=user_in)
    return updated_user

    updated_user = user_service.update_me(db_user=current_user, user_in=user_in)
    return updated_user

@router.get("/me", response_model=UserPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """
    Get current user.
    """
    return current_user

@router.delete("/me", response_model=Message)
def delete_user_me(user_service: UserServiceDep, current_user: CurrentUser) -> Any:
    """
    Delete own user.
    """
    if current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Super users are not allowed to delete themselves")
    user_service.delete(current_user)
    return Message(message="User deleted successfully")

@router.get("/{user_id}", response_model=UserPublic)
def read_user_by_id(user_id: uuid.UUID, user_service: UserServiceDep, current_user: CurrentUser) -> Any:
    """
    Get a specific user by id.
    """
    user = user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        return user
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return user

@router.patch("/{user_id}", dependencies=[Depends(get_current_active_superuser)], response_model=UserPublic)
def update_user(*, user_service: UserServiceDep, user_id: uuid.UUID, user_in: UserUpdate) -> Any:
    """
    Update a user.
    """
    db_user = user_service.get_by_id(user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_in.email:
        existing_user = user_service.get_by_email(email=user_in.email)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(status_code=409, detail="User with this email already exists")
    user = user_service.update(db_user=db_user, user_in=user_in)
    return user

@router.delete("/{user_id}", dependencies=[Depends(get_current_active_superuser)], response_model=Message)
def delete_user(user_service: UserServiceDep, current_user: CurrentUser, user_id: uuid.UUID) -> Any:
    """
    Delete a user.
    """
    user = user_service.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user == current_user:
        raise HTTPException(status_code=403, detail="Super users are not allowed to delete themselves")
    user_service.delete(user)
    return Message(message="User deleted successfully")
