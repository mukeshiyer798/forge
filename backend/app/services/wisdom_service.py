import logging
from app.repositories.wisdom_repository import WisdomRepository
from app.entities.wisdom import Wisdom
from app.entities.user import User
from app.services.ai_service import AiService

logger = logging.getLogger(__name__)

class WisdomService:
    def __init__(self, repo: WisdomRepository, ai_service: AiService):
        self.repo = repo
        self.ai = ai_service

    async def get_universal_wisdoms(self, limit: int = 3, user: User | None = None) -> list[Wisdom]:
        # Check cache pool size — DB is the primary source of truth
        count = self.repo.get_total_count()
        logger.debug(f"[WISDOM] DB pool size={count}, requested limit={limit}")
        
        # If we have less than 10 total wisdoms in DB, generate 3 more utilizing AI!
        if count < 10:
            logger.info(f"[WISDOM] Cache low ({count}<10) — attempting AI generation")
            try:
                # Need an active user with an API key to trigger generation. 
                if user and user.encrypted_openrouter_key:
                    items = await self.ai.generate_wisdom(user=user)
                    
                    saved_count = 0
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        wisdom = Wisdom(
                            title=item.get("title", "Untitled"),
                            book=item.get("book", "Unknown"),
                            author=item.get("author", "Unknown"),
                            category=item.get("category", "mindset"),
                            summary=item.get("summary", ""),
                            key_lesson=item.get("keyLesson", ""),
                            how_to_apply=item.get("howToApply", "")
                        )
                        self.repo.save_wisdom(wisdom)
                        saved_count += 1
                    logger.info(f"[WISDOM] Generated and persisted {saved_count} wisdom entries to DB")
                else:
                    logger.debug(f"[WISDOM] Skipping AI generation — user has no API key")
            except Exception as e:
                logger.error(f"[WISDOM] Failed to generate universal wisdom: {e}")
        else:
            logger.debug(f"[WISDOM] Serving from DB cache (pool={count})")
        
        # Now fetch from DB (guaranteed to be random)
        wisdoms = self.repo.get_random_wisdoms(limit)
        logger.debug(f"[WISDOM] Returning {len(wisdoms)} wisdoms from DB")
        return wisdoms
