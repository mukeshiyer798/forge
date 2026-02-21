from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

from app.core.config import settings

password_hash = PasswordHash(
    (
        Argon2Hasher(),
        BcryptHasher(),
    )
)


ALGORITHM = "HS256"


def create_access_token(subject: str | Any, expires_delta: timedelta) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_password(
    plain_password: str, hashed_password: str
) -> tuple[bool, str | None]:
    return password_hash.verify_and_update(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return password_hash.hash(password)


import base64
import hashlib
from cryptography.fernet import Fernet

def _get_encryption_key() -> bytes:
    # Derive a valid 32-byte url-safe base64 key from the application's SECRET_KEY
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(digest)

_fernet = Fernet(_get_encryption_key())

def encrypt_api_key(api_key: str | None) -> str | None:
    if not api_key:
        return None
    return _fernet.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key: str | None) -> str | None:
    if not encrypted_key:
        return None
    return _fernet.decrypt(encrypted_key.encode()).decode()
from sqlalchemy.types import TypeDecorator, String

class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def __init__(self, length=None, *args, **kwargs):
        super().__init__(length, *args, **kwargs)

    def process_bind_param(self, value, dialect):
        if value is not None:
            return _fernet.encrypt(value.encode('utf-8')).decode('utf-8')
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            try:
                return _fernet.decrypt(value.encode('utf-8')).decode('utf-8')
            except Exception:
                # If decryption fails (e.g. legacy plain text), return raw string safely.
                return value
        return value
