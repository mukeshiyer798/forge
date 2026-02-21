import uuid
from sqlmodel import SQLModel
from app.entities.wisdom import WisdomBase

class WisdomPublic(WisdomBase):
    id: uuid.UUID

class WisdomsPublic(SQLModel):
    data: list[WisdomPublic]
    count: int
