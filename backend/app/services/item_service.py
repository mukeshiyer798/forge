import uuid
from app.repositories.item_repository import ItemRepository
from app.models.item import ItemCreate, ItemUpdate
from app.entities.item import Item
from app.entities.user import User

class ItemService:
    def __init__(self, repo: ItemRepository):
        self.repo = repo

    def get_items(self, user: User, skip: int, limit: int) -> tuple[list[Item], int]:
        if user.is_superuser:
            return self.repo.get_all(skip, limit)
        return self.repo.get_by_owner_id(user.id, skip, limit)

    def get_item(self, id: uuid.UUID, user: User) -> Item | None:
        item = self.repo.get_by_id(id)
        if not item:
            return None
        if not user.is_superuser and item.owner_id != user.id:
            raise PermissionError("Not enough permissions")
        return item

    def create(self, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
        db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
        return self.repo.save(db_item)

    def update(self, id: uuid.UUID, item_in: ItemUpdate, user: User) -> Item | None:
        item = self.get_item(id, user)
        if not item:
            return None
        update_dict = item_in.model_dump(exclude_unset=True)
        item.sqlmodel_update(update_dict)
        return self.repo.save(item)

    def delete(self, id: uuid.UUID, user: User) -> bool:
        item = self.get_item(id, user)
        if not item:
            return False
        self.repo.delete(item)
        return True
