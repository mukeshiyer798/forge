import orjson
import logging
import httpx
from app.core.config import settings
from app.entities.user import User
from app.core.security import decrypt_api_key
from app.core.logging import get_logger
import re

from app.utils.date_utils import get_datetime_utc
logger = get_logger("services.ai")

OPENROUTER_URL = settings.OPENROUTER_URL
MODEL = "google/gemini-2.0-flash-001"
ADMIN_MODEL = "perplexity/sonar-pro"

class AiService:
    async def generate_response(self, prompt: str, user: User, model: str = "google/gemini-2.0-flash-001", api_key_override: str | None = None) -> dict:
        api_key = api_key_override or decrypt_api_key(user.encrypted_openrouter_key)

        if not api_key:
            logger.warning("ai.generate.no_api_key", extra={
                "user_id": str(user.id),
                "has_encrypted_key": bool(user.encrypted_openrouter_key),
            })
            raise ValueError("You have not configured an OpenRouter API key. Please add one in your settings.")

        # Superusers get a better model by default
        if user.is_superuser and model == MODEL:
            model = ADMIN_MODEL
            logger.info("ai.generate.model_upgrade", extra={
                "user_id": str(user.id),
                "model": ADMIN_MODEL,
            })

        logger.info("ai.generate.started", extra={
            "user_id": str(user.id),
            "model": model,
            "prompt_len": len(prompt),
        })

        try:
            return await self._execute_request(prompt, model, api_key, user)
        except Exception as e:
            if model != MODEL:
                logger.warning("ai.generate.fallback", extra={
                    "user_id": str(user.id),
                    "failed_model": model,
                    "fallback_model": MODEL,
                    "error": str(e)[:200],
                })
                return await self._execute_request(prompt, MODEL, decrypt_api_key(user.encrypted_openrouter_key), user)
            raise e

    async def _execute_request(self, prompt: str, model: str, api_key: str | None, user: User) -> dict:
        logger.debug("ai.request.sending", extra={"model": model, "url": OPENROUTER_URL})
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.FRONTEND_HOST,
            "X-Title": "FORGE",
        }

        if "json" not in prompt.lower():
            prompt += "\n\nOutput MUST be valid JSON."

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
        }

        if "gemini" in model.lower():
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                logger.info("ai.request.response", extra={
                    "status_code": response.status_code,
                    "model": model,
                })
                response.raise_for_status()
                data = response.json()

                if "error" in data and data["error"]:
                    error_msg = data["error"].get("message", "Unknown OpenRouter Error")
                    logger.error("ai.request.api_error", extra={
                        "error": error_msg,
                        "model": model,
                    })
                    raise ConnectionError(error_msg)

                text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if not text.strip():
                    logger.error("ai.request.empty_response", extra={"model": model})
                    raise ValueError("Empty response from AI")

                cleaned = re.sub(r"^```(?:json)?\s*([\s\S]*?)```\s*$", r"\1", text.strip(), flags=re.MULTILINE)
                logger.info("ai.request.success", extra={
                    "response_len": len(cleaned),
                    "model": model,
                })
                return orjson.loads(cleaned)

        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            logger.error("ai.request.http_error", extra={
                "status_code": e.response.status_code,
                "error": error_detail[:200],
                "model": model,
            })
            raise ConnectionError(f"AI Provider Error: {e.response.status_code} - {error_detail[:100]}")

    async def generate_insights(self, goals: list[dict], industries: list[str], user: User) -> list[dict]:
        from app.prompts.reading_insights import build_reading_insights_prompt
        logger.info("ai.insights.generating", extra={
            "user_id": str(user.id),
            "goal_count": len(goals),
            "industry_count": len(industries),
        })
        current_date = get_datetime_utc().strftime("%Y-%m-%d")
        prompt = build_reading_insights_prompt(goals, industries, current_date=current_date)
        response = await self.generate_response(prompt, user)
        if isinstance(response, list):
            return response
        return response.get("insights", [])

    async def generate_wisdom(self, user: User) -> list[dict]:
        from app.prompts.reading_insights import build_mindset_prompt
        logger.info("ai.wisdom.generating", extra={"user_id": str(user.id)})
        prompt = build_mindset_prompt()
        response = await self.generate_response(prompt, user)
        if isinstance(response, list):
            return response
        return response.get("mindset", response.get("lessons", []))

    async def generate_intelligence_feed(self, goals: list[dict], user: User, keywords: str | None = None) -> list[dict]:
        """Generate phase-aware contextual insights (Layer 2)."""
        from app.prompts.intelligence_feed import build_intelligence_feed_prompt
        logger.info("ai.intelligence_feed.generating", extra={
            "user_id": str(user.id),
            "goal_count": len(goals),
            "has_keywords": bool(keywords),
        })
        current_date = get_datetime_utc().strftime("%Y-%m-%d")
        prompt = build_intelligence_feed_prompt(goals, keywords, current_date=current_date)
        response = await self.generate_response(prompt, user)
        if isinstance(response, list):
            return response
        return response.get("items", response.get("feed", []))

    async def generate_frameworks(self, goals: list[dict], user: User) -> list[dict]:
        """Generate applied mental frameworks (Layer 3)."""
        from app.prompts.applied_frameworks import build_applied_framework_prompt
        logger.info("ai.frameworks.generating", extra={
            "user_id": str(user.id),
            "goal_count": len(goals),
        })
        prompt = build_applied_framework_prompt(goals)
        response = await self.generate_response(prompt, user)
        if isinstance(response, list):
            return response
        return response.get("frameworks", [])

    async def test_key(self, api_key: str) -> bool:
        """Tests an API key directly without needing a user DB entry."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.FRONTEND_HOST,
            "X-Title": "FORGE",
        }
        payload = {
            "model": MODEL,
            "messages": [{"role": "user", "content": "Return exactly: {\"ok\": true}"}],
            "response_format": {"type": "json_object"},
        }
        logger.info("ai.test_key.started", extra={"key_len": len(api_key)})
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                logger.info("ai.test_key.response", extra={
                    "status_code": response.status_code,
                })
                if response.status_code != 200:
                    logger.warning("ai.test_key.failed", extra={
                        "status_code": response.status_code,
                    })
                    return False
                data = response.json()
                if "error" in data and data["error"]:
                    logger.warning("ai.test_key.api_error", extra={
                        "error": str(data["error"])[:200],
                    })
                    return False
                logger.info("ai.test_key.success")
                return True
        except orjson.JSONDecodeError as e:
            logger.error("ai.test_key.json_error", extra={"error": str(e)})
            raise ValueError("AI returned malformed JSON data")
        except Exception as e:
            logger.error("ai.test_key.exception", extra={
                "error_type": type(e).__name__,
                "error": str(e)[:200],
            })
            return False
