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

        logger.info(f"[AI] User {user.id} — generating response with model={model}, prompt_len={len(prompt)}")

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
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI JSON response: {e}")
            raise ValueError("AI returned malformed JSON data")
        except Exception as e:
            logger.error(f"Unexpected AI proxy error: {e}")
            raise RuntimeError("Internal server error during AI generation")
