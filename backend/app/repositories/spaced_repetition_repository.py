import uuid
from datetime import datetime
from sqlmodel import Session, select, col
from app.entities.spaced_repetition import SpacedRepetitionItem

class SpacedRepetitionRepository:
    def __init__(self, session: Session):
        self.session = session

    def save(self, item: SpacedRepetitionItem) -> SpacedRepetitionItem:
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def get_by_id(self, id: uuid.UUID) -> SpacedRepetitionItem | None:
        return self.session.get(SpacedRepetitionItem, id)

    def get_due_items(self, owner_id: uuid.UUID, end_of_day: datetime) -> list[SpacedRepetitionItem]:
        statement = (
            select(SpacedRepetitionItem)
            .where(SpacedRepetitionItem.owner_id == owner_id)
            .where(SpacedRepetitionItem.next_review_at <= end_of_day)
            .order_by(col(SpacedRepetitionItem.next_review_at).asc())
        )
        return list(self.session.exec(statement).all())
