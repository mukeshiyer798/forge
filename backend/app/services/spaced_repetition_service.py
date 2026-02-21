import uuid
from datetime import datetime, timedelta, timezone
from app.repositories.spaced_repetition_repository import SpacedRepetitionRepository
from app.repositories.goal_repository import GoalRepository
from app.models.spaced_repetition import SpacedRepetitionItemCreate, SpacedRepetitionReview
from app.entities.spaced_repetition import SpacedRepetitionItem
from app.entities.user import User
from app.utils.prompt_generator import generate_review_prompt
from app.utils.spaced_repetition import calculate_next_interval

class SpacedRepetitionService:
    def __init__(self, repo: SpacedRepetitionRepository, goal_repo: GoalRepository):
        self.repo = repo
        self.goal_repo = goal_repo

    def get_due_items(self, user: User) -> list[SpacedRepetitionItem]:
        now = datetime.now(timezone.utc)
        end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        return self.repo.get_due_items(user.id, end_of_day)

    def get_item(self, id: uuid.UUID, user: User) -> SpacedRepetitionItem | None:
        item = self.repo.get_by_id(id)
        if not item:
            return None
        if item.owner_id != user.id:
            raise PermissionError("Not enough permissions")
        return item

    def create(self, item_in: SpacedRepetitionItemCreate, user: User) -> SpacedRepetitionItem:
        goal = self.goal_repo.get_by_id(item_in.goal_id)
        if not goal:
            raise ValueError("Goal not found")
        if goal.owner_id != user.id:
            raise PermissionError("Not enough permissions to use this goal")

        next_review = datetime.now(timezone.utc) + timedelta(days=1)

        db_item = SpacedRepetitionItem(
            owner_id=user.id,
            goal_id=item_in.goal_id,
            topic_id=item_in.topic_id,
            topic_name=item_in.topic_name,
            active_recall_question=item_in.active_recall_question,
            resources=item_in.resources,
            next_review_at=next_review,
        )
        return self.repo.save(db_item)

    def submit_review(self, id: uuid.UUID, review: SpacedRepetitionReview, user: User) -> SpacedRepetitionItem | None:
        item = self.get_item(id, user)
        if not item:
            return None

        next_interval, new_ease = calculate_next_interval(
            correct=review.correct,
            current_interval_days=item.interval_days,
            ease_factor=item.ease_factor,
            consecutive_correct=item.consecutive_correct,
            review_count=item.review_count,
        )

        now = datetime.now(timezone.utc)
        next_review = now + timedelta(days=next_interval)

        item.last_reviewed_at = now
        item.next_review_at = next_review
        item.ease_factor = new_ease
        item.interval_days = next_interval
        item.review_count += 1
        if review.correct:
            item.consecutive_correct += 1
        else:
            item.consecutive_correct = 0

        return self.repo.save(item)

    def get_review_prompt(self, id: uuid.UUID, user: User) -> tuple[str, str] | None:
        item = self.get_item(id, user)
        if not item:
            return None

        prompt = generate_review_prompt(
            topic_name=item.topic_name,
            resources=item.resources,
            active_recall_question=item.active_recall_question,
        )
        return prompt, item.topic_name
