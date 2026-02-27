import uuid
from sqlmodel import Session
from app.services.user_service import UserService
from app.repositories.user_repository import UserRepository
from app.services.item_service import ItemService
from app.repositories.item_repository import ItemRepository
from app.models.user import UserCreate, UserUpdate
from app.models.item import ItemCreate, ItemUpdate
from app.entities.user import User
from app.entities.item import Item

def get_user_by_email(*, session: Session, email: str) -> User | None:
    repo = UserRepository(session)
    return repo.get_by_email(email)

def create_user(*, session: Session, user_create: UserCreate) -> User:
    repo = UserRepository(session)
    service = UserService(repo)
    return service.create(user_create)

def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> User:
    repo = UserRepository(session)
    service = UserService(repo)
    return service.update(db_user, user_in)

def authenticate(*, session: Session, email: str, password: str) -> User | None:
    repo = UserRepository(session)
    service = UserService(repo)
    return service.authenticate(email, password)

def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    repo = ItemRepository(session)
    service = ItemService(repo)
    return service.create(item_in, owner_id)

def get_item(*, session: Session, id: uuid.UUID) -> Item | None:
    repo = ItemRepository(session)
    return repo.get_by_id(id)

def update_item(*, session: Session, db_item: Item, item_in: ItemUpdate) -> Item:
    repo = ItemRepository(session)
    update_dict = item_in.model_dump(exclude_unset=True)
    db_item.sqlmodel_update(update_dict)
    return repo.save(db_item)

def delete_item(*, session: Session, id: uuid.UUID) -> None:
    repo = ItemRepository(session)
    item = repo.get_by_id(id)
    if item:
        repo.delete(item)
