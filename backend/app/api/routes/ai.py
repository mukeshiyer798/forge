import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.api.deps import CurrentUser, AiServiceDep
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


class AIRequest(BaseModel):
    prompt: str
    model: str | None = "google/gemini-2.0-flash-001"

class AITestRequest(BaseModel):
    api_key: str | None = None

@router.post("/test", response_model=dict)
@limiter.limit("10/minute")
async def test_ai_key(
    request: Request,
    current_user: CurrentUser,
    ai_service: AiServiceDep,
    test_request: AITestRequest,
) -> dict:
    """Tests an API key directly without saving it. Falls back to DB key if null."""
    key_to_test = test_request.api_key
    if not key_to_test:
        from app.core.security import decrypt_api_key
        key_to_test = decrypt_api_key(current_user.encrypted_openrouter_key)
        
    if not key_to_test:
        return {"ok": False}
        
    is_valid = await ai_service.test_key(api_key=key_to_test)
    return {"ok": is_valid}

@router.post("/generate", response_model=Any)
@limiter.limit("30/minute")
async def generate_ai_response(
    request: Request,
    current_user: CurrentUser,
    ai_service: AiServiceDep,
    ai_request: AIRequest,
) -> Any:
    """
    Proxies requests to OpenRouter/Gemini using the user's provided API key.
    Requires authentication.
    """
    try:
        response = await ai_service.generate_response(
            prompt=ai_request.prompt, 
            user=current_user,
            model=ai_request.model or "google/gemini-2.0-flash-001"
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

