import uuid
from sqlmodel import Session, select, func, col
from app.entities.reading import Reading, ReadingInsight

class ReadingRepository:
    def __init__(self, session: Session):
        self.session = session

    # ── Readings ────────────────────────────────────────────────
    def save_reading(self, reading: Reading) -> Reading:
        self.session.add(reading)
        self.session.commit()
        self.session.refresh(reading)
        return reading

    def get_reading_by_id(self, id: uuid.UUID) -> Reading | None:
        return self.session.get(Reading, id)

    def get_readings_by_owner_id(self, owner_id: uuid.UUID, skip: int, limit: int, category: str | None = None, bookmarked_only: bool = False) -> tuple[list[Reading], int]:
        conditions = [Reading.owner_id == owner_id]
        if category:
            conditions.append(Reading.category == category)
        if bookmarked_only:
            conditions.append(Reading.is_bookmarked == True)

        count_statement = select(func.count()).select_from(Reading).where(*conditions)
        count = self.session.exec(count_statement).one()

        statement = (
            select(Reading)
            .where(*conditions)
            .order_by(col(Reading.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
        readings = self.session.exec(statement).all()
        return readings, count

    def delete_reading(self, reading: Reading) -> None:
        self.session.delete(reading)
        self.session.commit()

    # ── Reading Insights ───────────────────────────────────────
    def save_insight(self, insight: ReadingInsight) -> ReadingInsight:
        self.session.add(insight)
        self.session.commit()
        self.session.refresh(insight)
        return insight

    def get_insight_by_id(self, id: uuid.UUID) -> ReadingInsight | None:
        return self.session.get(ReadingInsight, id)

    def get_insights_by_owner_id(self, owner_id: uuid.UUID, skip: int, limit: int) -> tuple[list[ReadingInsight], int]:
        count_statement = select(func.count()).select_from(ReadingInsight).where(ReadingInsight.owner_id == owner_id)
        count = self.session.exec(count_statement).one()
        statement = (
            select(ReadingInsight)
            .where(ReadingInsight.owner_id == owner_id)
            .order_by(col(ReadingInsight.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
        insights = self.session.exec(statement).all()
        return insights, count

    def delete_insight(self, insight: ReadingInsight) -> None:
        self.session.delete(insight)
        self.session.commit()
