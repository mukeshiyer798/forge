import uuid
from sqlmodel import Session, select, func
from app.entities.wisdom import Wisdom

class WisdomRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_random_wisdoms(self, limit: int = 3) -> list[Wisdom]:
        statement = select(Wisdom).order_by(func.random()).limit(limit)
        return list(self.session.exec(statement).all())

    def get_total_count(self) -> int:
        statement = select(func.count()).select_from(Wisdom)
        return self.session.exec(statement).one()

    def save_wisdom(self, wisdom: Wisdom) -> Wisdom:
        self.session.add(wisdom)
        self.session.commit()
        self.session.refresh(wisdom)
        return wisdom
