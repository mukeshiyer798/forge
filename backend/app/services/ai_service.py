import json
import logging
import httpx
from app.core.config import settings
from app.entities.user import User
from app.core.security import decrypt_api_key
import re

logger = logging.getLogger(__name__)

OPENROUTER_URL = settings.OPENROUTER_URL
MODEL = "google/gemini-2.0-flash-001"

class AiService:
    async def generate_response(self, prompt: str, user: User, model: str = "google/gemini-2.0-flash-001") -> dict:
        api_key = decrypt_api_key(user.encrypted_openrouter_key)

        if not api_key:
            logger.error(f"[AI] User {user.id} — no API key configured. encrypted_key_exists={bool(user.encrypted_openrouter_key)}")
            raise ValueError("You have not configured an OpenRouter API key. Please add one in your settings.")

        masked = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
        logger.info(f"[AI] User {user.id} — generating response with model={model}, key={masked}, prompt_len={len(prompt)}")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.FRONTEND_HOST,
            "X-Title": "FORGE",
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                
                if "error" in data and data["error"]:
                    raise ConnectionError(data["error"].get("message", "Unknown OpenRouter Error"))
                
                text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if not text.strip():
                    logger.warning(f"[AI] User {user.id} — empty AI response")
                    raise ValueError("Empty response from AI")
                
                cleaned = re.sub(r"^```(?:json)?\s*([\s\S]*?)```\s*$", r"\1", text.strip(), flags=re.MULTILINE)
                
                logger.info(f"[AI] User {user.id} — AI response received, len={len(cleaned)}")
                return json.loads(cleaned)

        except httpx.HTTPStatusError as e:
            logger.error(f"OpenRouter HTTP error: {e.response.status_code} - {e.response.text}")
            raise ConnectionError(f"AI Provider Error: {e.response.status_code}")

    async def generate_insights(self, goal_names: list[str], goal_types: list[str], industries: list[str], user: User) -> list[dict]:
        from app.prompts.reading_insights import build_reading_insights_prompt
        prompt = build_reading_insights_prompt(goal_names, goal_types, industries)
        response = await self.generate_response(prompt, user)
        # response should be the list of insights directly or under a "insights" key
        if isinstance(response, list):
            return response
        return response.get("insights", [])

    async def generate_wisdom(self, user: User) -> list[dict]:
        from app.prompts.reading_insights import build_mindset_prompt
        prompt = build_mindset_prompt()
        response = await self.generate_response(prompt, user)
        if isinstance(response, list):
            return response
        return response.get("mindset", response.get("lessons", []))

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
        masked = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
        logger.info(f"[AI] Testing API key: {masked}")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                if response.status_code != 200:
                    return False
                data = response.json()
                if "error" in data and data["error"]:
                    return False
                return True
        except Exception as e:
            logger.warning(f"[AI] Live API key test failed: {e}")
            return False
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI JSON response: {e}")
            raise ValueError("AI returned malformed JSON data")
        except Exception as e:
            logger.error(f"Unexpected AI proxy error: {e}")
            raise RuntimeError("Internal server error during AI generation")
