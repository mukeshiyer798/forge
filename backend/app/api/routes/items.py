import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, ItemServiceDep
from app.models.item import ItemCreate, ItemPublic, ItemsPublic, ItemUpdate
from app.models.core import Message
from app.core.logging import get_logger

logger = get_logger("routes.items")

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=ItemsPublic)
def read_items(
    item_service: ItemServiceDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve items.
    """
    items, count = item_service.get_items(user=current_user, skip=skip, limit=limit)
    return ItemsPublic(data=items, count=count)


@router.get("/{id}", response_model=ItemPublic)
def read_item(item_service: ItemServiceDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get item by ID.
    """
    try:
        item = item_service.get_item(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.post("/", response_model=ItemPublic)
def create_item(
    *, item_service: ItemServiceDep, current_user: CurrentUser, item_in: ItemCreate
) -> Any:
    """
    Create new item.
    """
    item = item_service.create(item_in=item_in, owner_id=current_user.id)
    return item


@router.put("/{id}", response_model=ItemPublic)
def update_item(
    *,
    item_service: ItemServiceDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    item_in: ItemUpdate,
) -> Any:
    """
    Update an item.
    """
    try:
        item = item_service.update(id=id, item_in=item_in, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.delete("/{id}")
def delete_item(
    item_service: ItemServiceDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an item.
    """
    try:
        success = item_service.delete(id=id, user=current_user)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return Message(message="Item deleted successfully")
