import uuid
from sqlmodel import Session, select, func, col
from app.entities.item import Item

class ItemRepository:
    def __init__(self, session: Session):
        self.session = session

    def save(self, item: Item) -> Item:
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def get_by_id(self, id: uuid.UUID) -> Item | None:
        return self.session.get(Item, id)

    def get_all(self, skip: int, limit: int) -> tuple[list[Item], int]:
        count = self.session.exec(select(func.count()).select_from(Item)).one()
        statement = select(Item).order_by(col(Item.created_at).desc()).offset(skip).limit(limit)
        items = self.session.exec(statement).all()
        return items, count

    def get_by_owner_id(self, owner_id: uuid.UUID, skip: int, limit: int) -> tuple[list[Item], int]:
        count_statement = select(func.count()).select_from(Item).where(Item.owner_id == owner_id)
        count = self.session.exec(count_statement).one()
        statement = select(Item).where(Item.owner_id == owner_id).order_by(col(Item.created_at).desc()).offset(skip).limit(limit)
        items = self.session.exec(statement).all()
        return items, count

    def delete(self, item: Item) -> None:
        self.session.delete(item)
        self.session.commit()
