import uuid

from app.repositories.user_repository import UserRepository
from app.models.user import UserCreate, UserUpdate, UserUpdateMe, UpdatePassword, UserRegister
from app.entities.user import User
from app.core.security import get_password_hash, verify_password, encrypt_api_key
from app.core.config import settings
from app.core.logging import get_logger
from app.utils import generate_new_account_email, send_email

logger = get_logger("services.user")

class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    def get_all(self, skip: int, limit: int) -> tuple[list[User], int]:
        return self.repo.get_all(skip, limit)

    def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return self.repo.get_by_id(user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.repo.get_by_email(email)

    def create(self, user_create: UserCreate) -> User:
        db_obj = User.model_validate(
            user_create, update={"hashed_password": get_password_hash(user_create.password)}
        )
        user = self.repo.save(db_obj)
        logger.info("user.created", extra={
            "user_id": str(user.id),
            "email_domain": user_create.email.split("@")[-1] if user_create.email else "unknown",
        })
        
        if settings.emails_enabled and user_create.email:
            email_data = generate_new_account_email(
                email_to=user_create.email, username=user_create.email, password=user_create.password
            )
            send_email(
                email_to=user_create.email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )
        return user

    def update(self, db_user: User, user_in: UserUpdate) -> User:
        user_data = user_in.model_dump(exclude_unset=True)
        extra_data = {}
        if "password" in user_data:
            password = user_data["password"]
            hashed_password = get_password_hash(password)
            extra_data["hashed_password"] = hashed_password
        db_user.sqlmodel_update(user_data, update=extra_data)
        return self.repo.save(db_user)

    def update_me(self, db_user: User, user_in: UserUpdateMe) -> User:
        user_data = user_in.model_dump(exclude_unset=True)
        extra_data = {}
        if "openrouter_api_key" in user_data:
            api_key = user_data.pop("openrouter_api_key")
            if api_key is None:
                # Explicit clear — user pressed "Clear" button
                extra_data["encrypted_openrouter_key"] = None
                logger.info("user.api_key.cleared", extra={"user_id": str(db_user.id)})
            elif api_key == "":
                # Empty string = no change, skip
                logger.debug("user.api_key.no_change", extra={"user_id": str(db_user.id)})
            else:
                extra_data["encrypted_openrouter_key"] = encrypt_api_key(api_key)
                logger.info("user.api_key.stored", extra={"user_id": str(db_user.id)})
        else:
            logger.debug("user.api_key.not_in_payload", extra={"user_id": str(db_user.id)})
            
        db_user.sqlmodel_update(user_data, update=extra_data)
        saved = self.repo.save(db_user)
        logger.info("user.profile.updated", extra={
            "user_id": str(db_user.id),
            "fields_changed": list(user_data.keys()) + list(extra_data.keys()),
        })
        return saved

    def update_password(self, db_user: User, body: UpdatePassword) -> bool:
        verified, _ = verify_password(body.current_password, db_user.hashed_password)
        if not verified:
            return False
            
        hashed_password = get_password_hash(body.new_password)
        db_user.hashed_password = hashed_password
        self.repo.save(db_user)
        return True

    def delete(self, user: User) -> None:
        logger.info("user.deleted", extra={"user_id": str(user.id)})
        self.repo.delete(user)

    def register(self, user_in: UserRegister) -> User:
        user_create = UserCreate.model_validate(user_in)
        db_obj = User.model_validate(
            user_create, update={"hashed_password": get_password_hash(user_create.password)}
        )
        user = self.repo.save(db_obj)

        if settings.emails_enabled:
            try:
                email_data = generate_new_account_email(
                    email_to=user.email,
                    username=user.full_name or user.email.split("@")[0],
                    password=user_in.password,
                )
                send_email(
                    email_to=user.email,
                    subject=f"Welcome to {settings.PROJECT_NAME}! 🔥",
                    html_content=email_data.html_content,
                )
            except Exception:
                pass  # Don't fail signup if email fails
        return user

    def authenticate(self, email: str, password: str) -> User | None:
        db_user = self.get_by_email(email)
        if not db_user:
            logger.info("auth.login.unknown_email")
            verify_password(password, settings.DUMMY_HASH)
            return None
        verified, updated_password_hash = verify_password(password, db_user.hashed_password)
        if not verified:
            logger.warning("auth.login.failed", extra={"user_id": str(db_user.id)})
            return None
        if updated_password_hash:
            db_user.hashed_password = updated_password_hash
            self.repo.save(db_user)
        logger.info("auth.login.success", extra={
            "user_id": str(db_user.id),
            "has_api_key": bool(db_user.encrypted_openrouter_key),
        })
        return db_user

    def recover_password(self, email: str) -> None:
        from app.utils import generate_password_reset_token, generate_reset_password_email, send_email
        user = self.get_by_email(email)
        if user:
            password_reset_token = generate_password_reset_token(email=email)
            email_data = generate_reset_password_email(
                email_to=user.email, email=email, token=password_reset_token
            )
            send_email(
                email_to=user.email,
                subject=email_data.subject,
                html_content=email_data.html_content,
            )

    def reset_password(self, token: str, new_password: str) -> bool:
        from app.utils import verify_password_reset_token
        email = verify_password_reset_token(token=token)
        if not email:
            return False
            
        user = self.get_by_email(email)
        if not user or not user.is_active:
            return False
            
        hashed_password = get_password_hash(new_password)
        user.hashed_password = hashed_password
        self.repo.save(user)
        return True

    def generate_password_recovery_html(self, email: str) -> tuple[str, str] | None:
        from app.utils import generate_password_reset_token, generate_reset_password_email
        user = self.get_by_email(email)
        if not user:
            return None
        password_reset_token = generate_password_reset_token(email=email)
        email_data = generate_reset_password_email(
            email_to=user.email, email=email, token=password_reset_token
        )
        return email_data.html_content, email_data.subject

