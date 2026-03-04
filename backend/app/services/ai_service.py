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
ADMIN_MODEL = "perplexity/sonar-pro"

class AiService:
    async def generate_response(self, prompt: str, user: User, model: str = "google/gemini-2.0-flash-001", api_key_override: str | None = None) -> dict:
        api_key = api_key_override or decrypt_api_key(user.encrypted_openrouter_key)

        if not api_key:
            print(f"[FORGE-DEBUG] AiService.generate_response — NO API KEY for user={user.id}, encrypted_key_exists={bool(user.encrypted_openrouter_key)}", flush=True)
            raise ValueError("You have not configured an OpenRouter API key. Please add one in your settings.")

        # Superusers get a better model by default
        if user.is_superuser and model == MODEL:
            model = ADMIN_MODEL
            print(f"[FORGE-DEBUG] AiService — Superuser {user.id} upgraded to {ADMIN_MODEL}", flush=True)

        masked = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
        print(f"[FORGE-DEBUG] AiService.generate_response — user={user.id}, model={model}, key={masked}, prompt_len={len(prompt)}", flush=True)

        try:
            return await self._execute_request(prompt, model, api_key, user)
        except Exception as e:
            if model != MODEL:
                print(f"[FORGE-DEBUG] AiService — Model {model} FAILED for user={user.id}, falling back to Gemini. Error: {e}", flush=True)
                return await self._execute_request(prompt, MODEL, decrypt_api_key(user.encrypted_openrouter_key), user)
            raise e

    async def _execute_request(self, prompt: str, model: str, api_key: str | None, user: User) -> dict:
        print(f"[FORGE-DEBUG] AiService._execute_request — model={model}, url={OPENROUTER_URL}", flush=True)
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
                print(f"[FORGE-DEBUG] AiService — Sending request to OpenRouter...", flush=True)
                response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                print(f"[FORGE-DEBUG] AiService — OpenRouter responded: status={response.status_code}", flush=True)
                response.raise_for_status()
                data = response.json()
                
                if "error" in data and data["error"]:
                    error_msg = data["error"].get("message", "Unknown OpenRouter Error")
                    print(f"[FORGE-DEBUG] AiService — OpenRouter API-level error: {error_msg}", flush=True)
                    raise ConnectionError(error_msg)
                
                text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                if not text.strip():
                    print(f"[FORGE-DEBUG] AiService — Empty response from AI", flush=True)
                    raise ValueError("Empty response from AI")
                
                cleaned = re.sub(r"^```(?:json)?\s*([\s\S]*?)```\s*$", r"\1", text.strip(), flags=re.MULTILINE)
                print(f"[FORGE-DEBUG] AiService — AI response received, len={len(cleaned)}", flush=True)
                return json.loads(cleaned)

        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            print(f"[FORGE-DEBUG] AiService — HTTP ERROR {e.response.status_code}: {error_detail[:200]}", flush=True)
            raise ConnectionError(f"AI Provider Error: {e.response.status_code} - {error_detail[:100]}")

    async def generate_insights(self, goals: list[dict], industries: list[str], user: User) -> list[dict]:
        from app.prompts.reading_insights import build_reading_insights_prompt
        prompt = build_reading_insights_prompt(goals, industries)
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

    async def generate_intelligence_feed(self, goals: list[dict], user: User, keywords: str | None = None) -> list[dict]:
        """Generate phase-aware contextual insights (Layer 2)."""
        from app.prompts.intelligence_feed import build_intelligence_feed_prompt
        prompt = build_intelligence_feed_prompt(goals, keywords)
        response = await self.generate_response(prompt, user)
        if isinstance(response, list):
            return response
        return response.get("items", response.get("feed", []))

    async def generate_frameworks(self, goals: list[dict], user: User) -> list[dict]:
        """Generate applied mental frameworks (Layer 3)."""
        from app.prompts.applied_frameworks import build_applied_framework_prompt
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
        masked = f"{api_key[:8]}...{api_key[-4:]}" if len(api_key) > 12 else "***"
        print(f"[FORGE-DEBUG] test_key — key={masked}, key_len={len(api_key)}, referer={settings.FRONTEND_HOST}", flush=True)
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
                print(f"[FORGE-DEBUG] test_key — OpenRouter status={response.status_code}, body={response.text[:200]}", flush=True)
                if response.status_code != 200:
                    return False
                data = response.json()
                if "error" in data and data["error"]:
                    print(f"[FORGE-DEBUG] test_key — API error: {data['error']}", flush=True)
                    return False
                return True
        except json.JSONDecodeError as e:
            print(f"[FORGE-DEBUG] test_key — JSON decode error: {e}", flush=True)
            raise ValueError("AI returned malformed JSON data")
        except Exception as e:
            print(f"[FORGE-DEBUG] test_key — Exception: {type(e).__name__}: {e}", flush=True)
            return False

