import uuid
from sqlmodel import Session, select, func
from app.entities.user import User

class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def save(self, user: User) -> User:
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email)
        return self.session.exec(statement).first()

    def get_by_id(self, id: uuid.UUID) -> User | None:
        return self.session.get(User, id)

    def get_all(self, skip: int, limit: int) -> tuple[list[User], int]:
        count = self.session.exec(select(func.count()).select_from(User)).one()
        statement = select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
        users = self.session.exec(statement).all()
        return users, count

    def delete(self, user: User) -> None:
        self.session.delete(user)
        self.session.commit()
