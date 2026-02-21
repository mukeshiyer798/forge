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

    async def get_universal_wisdoms(self, limit: int = 3, user: User = None) -> list[Wisdom]:
        # Check cache pool size
        count = self.repo.get_total_count()
        
        # If we have less than 10 total wisdoms in DB, generate 3 more utilizing AI!
        if count < 10:
            logger.info("Universal wisdom cache low, generating new insights from AI...")
            prompt = """Generate 3 unique, profound, and bite-sized 'Mindset' lessons or quotes from well-known books or successful individuals. 
            Format exactly as a JSON array of objects with keys: "title", "book", "author", "category" (use "mindset"), "summary", "keyLesson", "howToApply".
            Ensure the content is universally applicable to self-improvement or software engineering focus."""
            
            try:
                # Need an active user with an API key to trigger generation. 
                if user and user.encrypted_openrouter_key:
                    result = await self.ai.generate_response(prompt=prompt, user=user)
                    
                    if isinstance(result, list):
                        for item in result:
                            # Map JSON keys to Python entity fields
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
            except Exception as e:
                logger.error(f"Failed to generate universal wisdom: {e}")
        
        # Now fetch from DB (guaranteed to be random)
        return self.repo.get_random_wisdoms(limit)
