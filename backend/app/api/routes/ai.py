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

