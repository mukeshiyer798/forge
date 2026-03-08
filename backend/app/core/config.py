import secrets
import warnings
from typing import Annotated, Any, Literal

from pydantic import (
    AnyUrl,
    BeforeValidator,
    EmailStr,
    HttpUrl,
    PostgresDsn,
    computed_field,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self


import orjson
def parse_cors(v: Any) -> list[str] | str:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",") if i.strip()]
    elif isinstance(v, str) and v.startswith("["):
        return orjson.loads(v)
    elif isinstance(v, list):
        return v
    raise ValueError(v)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Use top level .env file (one level above ./backend/)
        env_file="../.env",
        env_ignore_empty=True,
        extra="ignore",
    )
    API_V1_STR: str = "/api/v1"
    # SECRET_KEY should be a long, secure random string. 
    # Use 'changethis' as default to trigger the validation error if not set in production.
    SECRET_KEY: str = "changethis"
    # 60 minutes = 1 hour (short-lived access token for security)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    # 60 minutes * 24 hours * 7 days = 7 days (refresh token for "remember me")
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    FRONTEND_HOST: str = "http://localhost:5173"
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"
    APP_VERSION: str = "0.1.0"
    LOG_LEVEL: str = "INFO"

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyUrl] | str, BeforeValidator(parse_cors)
    ] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [
            self.FRONTEND_HOST
        ]

    PROJECT_NAME: str
    SENTRY_DSN: str = ""
    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_URL: str = "https://openrouter.ai/api/v1/chat/completions"

    # ── Clerk config ──
    CLERK_SECRET_KEY: str | None = None
    CLERK_PUBLISHABLE_KEY: str | None = None

    # ── Mailgun config ──
    MAILGUN_API_KEY: str | None = None
    MAILGUN_DOMAIN: str | None = None
    MAILGUN_API_URL: str = "https://api.mailgun.net/v3"

    # ── Brevo config ──
    BREVO_API_KEY: str | None = None
    BREVO_API_URL: str = "https://api.brevo.com/v3/smtp/email"

    # ── Goal constraints (used by GoalService) ──
    MAX_ACTIVE_GOALS: int = 7
    GOAL_ALLOWED_TYPES: list[str] = ["learn", "build", "habit", "fitness"]
    GOAL_ALLOWED_STATUSES: list[str] = ["on-track", "at-risk", "behind", "paused", "completed"]

    @computed_field  # type: ignore[prop-decorator]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        return PostgresDsn.build(
            scheme="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: EmailStr | None = None
    EMAILS_FROM_NAME: str | None = None

    @model_validator(mode="after")
    def _set_default_emails_from(self) -> Self:
        if not self.EMAILS_FROM_NAME:
            self.EMAILS_FROM_NAME = self.PROJECT_NAME
        return self

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48
    
    # Application Defaults
    DUMMY_HASH: str = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"
    
    DEFAULT_EMAIL_MORNING_TIME: str = "07:00"
    DEFAULT_EMAIL_AFTERNOON_TIME: str = "14:00"
    DEFAULT_EMAIL_EVENING_TIME: str = "20:00"
    
    EMAIL_SUBJECT_TEST: str = "{project_name} - Test email"
    EMAIL_SUBJECT_RESET_PASSWORD: str = "{project_name} - Password recovery for user {email}"
    EMAIL_SUBJECT_NEW_ACCOUNT: str = "{project_name} - New account for user {username}"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def emails_enabled(self) -> bool:
        return bool(
            (self.SMTP_HOST and self.EMAILS_FROM_EMAIL)
            or (self.MAILGUN_API_KEY and self.MAILGUN_DOMAIN)
            or self.BREVO_API_KEY
        )

    EMAIL_TEST_USER: EmailStr = "test@example.com"
    FIRST_SUPERUSER: EmailStr
    FIRST_SUPERUSER_PASSWORD: str

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        if value == "changethis":
            message = (
                f'The value of {var_name} is "changethis", '
                "for security, please change it, at least for deployments."
            )
            if self.ENVIRONMENT == "local" and var_name != "SECRET_KEY":
                warnings.warn(message, stacklevel=1)
            else:
                raise ValueError(message)

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        self._check_default_secret("SECRET_KEY", self.SECRET_KEY)
        return self


settings = Settings()  # type: ignore
