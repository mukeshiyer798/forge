import uuid
import logging
from app.repositories.reading_repository import ReadingRepository
from app.models.reading import ReadingCreate, ReadingUpdate, ReadingInsightCreate
from app.entities.reading import Reading, ReadingInsight
from app.entities.user import User

logger = logging.getLogger(__name__)

SUGGESTED_ARTICLES = {
    "tech": [
        {"title": "Hacker News — Top Stories", "url": "https://news.ycombinator.com", "source": "Hacker News", "content_type": "article"},
        {"title": "The Pragmatic Engineer Newsletter", "url": "https://newsletter.pragmaticengineer.com", "source": "Pragmatic Engineer", "content_type": "article"},
        {"title": "Martin Fowler's Blog", "url": "https://martinfowler.com", "source": "Martin Fowler", "content_type": "article"},
        {"title": "ByteByteGo System Design", "url": "https://bytebytego.com", "source": "ByteByteGo", "content_type": "article"},
        {"title": "MIT OpenCourseWare — Computer Science", "url": "https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/", "source": "MIT OCW", "content_type": "course"},
        {"title": "ACM Queue — Research for Practitioners", "url": "https://queue.acm.org", "source": "ACM", "content_type": "paper"},
    ],
    "finance": [
        {"title": "Brookings Institution — Economic Analysis", "url": "https://www.brookings.edu/topic/economic-studies/", "source": "Brookings", "content_type": "paper"},
        {"title": "NBER Working Papers", "url": "https://www.nber.org/papers", "source": "NBER", "content_type": "paper"},
        {"title": "Matt Levine's Money Stuff", "url": "https://www.bloomberg.com/opinion/authors/ARbTQlRLRjE/matthew-s-levine", "source": "Bloomberg", "content_type": "article"},
        {"title": "Ray Dalio's Principles", "url": "https://www.principles.com", "source": "Bridgewater", "content_type": "book"},
        {"title": "IMF Blog — Global Economy", "url": "https://www.imf.org/en/Blogs", "source": "IMF", "content_type": "article"},
        {"title": "Federal Reserve Economic Data (FRED)", "url": "https://fred.stlouisfed.org", "source": "St. Louis Fed", "content_type": "article"},
    ],
    "health": [
        {"title": "Huberman Lab Podcast", "url": "https://hubermanlab.com", "source": "Andrew Huberman", "content_type": "podcast"},
        {"title": "Examine.com — Evidence-Based Nutrition", "url": "https://examine.com", "source": "Examine", "content_type": "article"},
        {"title": "Stronger By Science", "url": "https://www.strongerbyscience.com", "source": "SBS", "content_type": "article"},
        {"title": "Peter Attia's The Drive", "url": "https://peterattiamd.com", "source": "Peter Attia", "content_type": "podcast"},
    ],
    "productivity": [
        {"title": "Cal Newport's Blog", "url": "https://calnewport.com/blog/", "source": "Cal Newport", "content_type": "article"},
        {"title": "James Clear's 3-2-1 Newsletter", "url": "https://jamesclear.com/3-2-1", "source": "James Clear", "content_type": "article"},
        {"title": "Learning How to Learn (Coursera)", "url": "https://www.coursera.org/learn/learning-how-to-learn", "source": "Coursera / Dr. Oakley", "content_type": "course"},
        {"title": "Tim Ferriss Show — Routines of Top Performers", "url": "https://tim.blog/podcast/", "source": "Tim Ferriss", "content_type": "podcast"},
    ],
}

GOAL_TYPE_TO_CATEGORY = {
    "learn": "tech",
    "build": "tech",
    "habit": "productivity",
    "fitness": "health",
}

class ReadingService:
    def __init__(self, repo: ReadingRepository):
        self.repo = repo

    def get_readings(self, user: User, skip: int, limit: int, category: str | None = None, bookmarked_only: bool = False) -> tuple[list[Reading], int]:
        return self.repo.get_readings_by_owner_id(user.id, skip, limit, category, bookmarked_only)

    def create_reading(self, reading_in: ReadingCreate, user: User) -> Reading:
        reading = Reading(**reading_in.model_dump(), owner_id=user.id)
        return self.repo.save_reading(reading)

    def update_reading(self, id: uuid.UUID, reading_in: ReadingUpdate, user: User) -> Reading | None:
        reading = self.repo.get_reading_by_id(id)
        if not reading:
            return None
        if reading.owner_id != user.id:
            raise PermissionError("Not enough permissions")

        for field, value in reading_in.model_dump(exclude_unset=True).items():
            setattr(reading, field, value)

        return self.repo.save_reading(reading)

    def delete_reading(self, id: uuid.UUID, user: User) -> bool:
        reading = self.repo.get_reading_by_id(id)
        if not reading:
            return False
        if reading.owner_id != user.id:
            raise PermissionError("Not enough permissions")

        self.repo.delete_reading(reading)
        logger.info(f"Reading deleted - User: {user.id} - Reading ID: {id}")
        return True

    def get_suggestions(self, goal_types: str | None = None) -> dict:
        categories = set()
        if goal_types:
            for gt in goal_types.split(","):
                gt = gt.strip().lower()
                cat = GOAL_TYPE_TO_CATEGORY.get(gt, "productivity")
                categories.add(cat)
        else:
            categories = set(SUGGESTED_ARTICLES.keys())

        suggestions = []
        for cat in categories:
            for article in SUGGESTED_ARTICLES.get(cat, []):
                suggestions.append({**article, "category": cat})

        return {"suggestions": suggestions, "categories": sorted(categories)}

    def get_insights(self, user: User, skip: int, limit: int) -> tuple[list[ReadingInsight], int]:
        return self.repo.get_insights_by_owner_id(user.id, skip, limit)

    def create_insight(self, insight_in: ReadingInsightCreate, user: User) -> ReadingInsight:
        insight = ReadingInsight(**insight_in.model_dump(), owner_id=user.id)
        created_insight = self.repo.save_insight(insight)
        logger.info(f"Reading insight created - User: {user.id} - Insight ID: {created_insight.id}")
        return created_insight

    def delete_insight(self, id: uuid.UUID, user: User) -> bool:
        insight = self.repo.get_insight_by_id(id)
        if not insight:
            return False
        if insight.owner_id != user.id:
            raise PermissionError("Not enough permissions")

        self.repo.delete_insight(insight)
        return True
