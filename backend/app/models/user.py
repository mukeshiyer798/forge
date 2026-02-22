import uuid
from datetime import datetime
from typing import Any
from pydantic import EmailStr, computed_field, model_validator
from sqlmodel import Field, SQLModel
from app.entities.user import UserBase

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    nudge_preference: str = Field(default="daily", max_length=32)

class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=128)

class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)
    nudge_preference: str | None = Field(default=None, max_length=32)
    email_daily_plan_enabled: bool | None = None
    email_morning_time: str | None = Field(default=None, max_length=5)
    email_afternoon_time: str | None = Field(default=None, max_length=5)
    email_evening_time: str | None = Field(default=None, max_length=5)
    timezone: str | None = Field(default=None, max_length=64)
    theme_preference: str | None = Field(default=None, max_length=32)
    greeting_preference: str | None = Field(default=None, max_length=100)
    status_message: str | None = Field(default=None, max_length=255)
    openrouter_api_key: str | None = Field(default=None)

class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)

class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None
    encrypted_openrouter_key: str | None = Field(default=None, exclude=True)

    @model_validator(mode='before')
    @classmethod
    def _extract_encrypted_key(cls, data: Any) -> Any:
        # When FastAPI passes an ORM User object, manually extract the field
        # since it's not on UserBase and Pydantic won't map it automatically
        if not isinstance(data, dict) and hasattr(data, 'encrypted_openrouter_key'):
            return {
                **{k: v for k, v in data.__dict__.items() if not k.startswith('_')},
                'encrypted_openrouter_key': data.encrypted_openrouter_key,
            }
        return data

    @computed_field
    @property
    def has_openrouter_key(self) -> bool:
        return bool(self.encrypted_openrouter_key)

class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int
