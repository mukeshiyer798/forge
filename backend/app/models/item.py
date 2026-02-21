import uuid
from datetime import datetime
from sqlmodel import Field, SQLModel
from app.entities.item import ItemBase

class ItemCreate(ItemBase):
    pass

class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore

class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None

class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int
