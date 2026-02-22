import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.api.deps import CurrentUser, AiServiceDep, UserServiceDep
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


class AIRequest(BaseModel):
    prompt: str
    model: str | None = "google/gemini-2.0-flash-001"
    api_key: str | None = None

class AITestRequest(BaseModel):
    api_key: str | None = None

@router.post("/test", response_model=dict)
@limiter.limit("10/minute")
async def test_ai_key(
    request: Request,
    current_user: CurrentUser,
    ai_service: AiServiceDep,
    user_service: UserServiceDep,
    test_request: AITestRequest,
) -> dict:
    """Saves the API key first if provided, then tests it. Falls back to DB key if null."""
    key_to_test = test_request.api_key
    
    if key_to_test:
        from app.models.user import UserUpdateMe
        user_in = UserUpdateMe(openrouter_api_key=key_to_test)
        user_service.update_me(db_user=current_user, user_in=user_in)
    else:
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
    user_service: UserServiceDep,
    ai_request: AIRequest,
) -> Any:
    """
    Proxies requests to OpenRouter/Gemini using the user's provided API key.
    Saves the key to the DB if provided in the request body.
    Requires authentication.
    """
    if ai_request.api_key:
        from app.models.user import UserUpdateMe
        user_in = UserUpdateMe(openrouter_api_key=ai_request.api_key)
        user_service.update_me(db_user=current_user, user_in=user_in)
        logger.info(f"[AI] User {current_user.id} — saved new API key during generation")

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

