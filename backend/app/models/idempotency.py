import uuid
from datetime import datetime
from sqlmodel import SQLModel

class IdempotencyRecordCreate(SQLModel):
    idempotency_key: str
    user_id: uuid.UUID
    path: str
    status_code: int
    response_body: str

class IdempotencyRecordRead(SQLModel):
    idempotency_key: str
    user_id: uuid.UUID
    path: str
    status_code: int
    response_body: str
    created_at: datetime
