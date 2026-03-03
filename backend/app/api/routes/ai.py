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
    print(f"[FORGE-DEBUG] POST /ai/test — user={current_user.id}", flush=True)
    key_to_test = test_request.api_key
    
    if key_to_test:
        from app.models.user import UserUpdateMe
        user_in = UserUpdateMe(openrouter_api_key=key_to_test)
        user_service.update_me(db_user=current_user, user_in=user_in)
        print(f"[FORGE-DEBUG] /ai/test — saved new key for user={current_user.id}", flush=True)
    else:
        from app.core.security import decrypt_api_key
        key_to_test = decrypt_api_key(current_user.encrypted_openrouter_key)
        print(f"[FORGE-DEBUG] /ai/test — using stored key, exists={bool(key_to_test)}", flush=True)
        
    if not key_to_test:
        print(f"[FORGE-DEBUG] /ai/test — NO KEY for user={current_user.id}, returning ok=False", flush=True)
        return {"ok": False}
        
    is_valid = await ai_service.test_key(api_key=key_to_test)
    print(f"[FORGE-DEBUG] /ai/test — result: ok={is_valid}", flush=True)
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
    print(f"[FORGE-DEBUG] POST /ai/generate — user={current_user.id}, model={ai_request.model}, prompt_len={len(ai_request.prompt)}", flush=True)
    if ai_request.api_key:
        from app.models.user import UserUpdateMe
        user_in = UserUpdateMe(openrouter_api_key=ai_request.api_key)
        user_service.update_me(db_user=current_user, user_in=user_in)
        print(f"[FORGE-DEBUG] /ai/generate — saved new API key for user={current_user.id}", flush=True)

    try:
        response = await ai_service.generate_response(
            prompt=ai_request.prompt, 
            user=current_user,
            model=ai_request.model or "google/gemini-2.0-flash-001",
            api_key_override=ai_request.api_key or None
        )
        print(f"[FORGE-DEBUG] /ai/generate — SUCCESS for user={current_user.id}", flush=True)
        return response
    except ValueError as e:
        print(f"[FORGE-DEBUG] /ai/generate — ValueError: {e}", flush=True)
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        print(f"[FORGE-DEBUG] /ai/generate — ConnectionError: {e}", flush=True)
        raise HTTPException(status_code=502, detail=str(e))
    except RuntimeError as e:
        print(f"[FORGE-DEBUG] /ai/generate — RuntimeError: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


def _extract_goal_context(user) -> list[dict]:
    """Extract goal data with current phase and active topics for AI prompts."""
    goals_data = []
    for g in user.goals:
        import json as _json
        topics = []
        current_phase = 1
        current_topics = []
        try:
            topics = _json.loads(g.topics) if g.topics else []
        except (ValueError, TypeError):
            topics = []

        if topics:
            # Determine phase: first incomplete topic is current
            for t in topics:
                if not t.get("completed", False):
                    current_topics.append(t.get("name", ""))
                    current_phase = t.get("taskNumber", 1)
                    if len(current_topics) >= 3:
                        break

        goals_data.append({
            "name": g.name,
            "description": g.description or "",
            "current_phase": current_phase,
            "current_topics": current_topics or [g.name],
        })
    return goals_data


@router.post("/intelligence-feed")
@limiter.limit("10/minute")
async def generate_intelligence_feed(
    request: Request,
    current_user: CurrentUser,
    ai_service: AiServiceDep,
) -> Any:
    """Generate phase-aware contextual insights (Layer 2 - Intelligence Feed)."""
    print(f"[FORGE-DEBUG] POST /ai/intelligence-feed — user={current_user.id}, goals={len(current_user.goals)}", flush=True)
    goals_data = _extract_goal_context(current_user)
    print(f"[FORGE-DEBUG] /ai/intelligence-feed — extracted {len(goals_data)} goals, keywords={current_user.intelligence_keywords}", flush=True)
    try:
        items = await ai_service.generate_intelligence_feed(
            goals=goals_data, 
            keywords=current_user.intelligence_keywords,
            user=current_user
        )
        print(f"[FORGE-DEBUG] /ai/intelligence-feed — SUCCESS, returned {len(items)} items", flush=True)
        return {"data": items, "count": len(items)}
    except ValueError as e:
        print(f"[FORGE-DEBUG] /ai/intelligence-feed — ValueError: {e}", flush=True)
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        print(f"[FORGE-DEBUG] /ai/intelligence-feed — ConnectionError: {e}", flush=True)
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/frameworks")
@limiter.limit("10/minute")
async def generate_frameworks(
    request: Request,
    current_user: CurrentUser,
    ai_service: AiServiceDep,
) -> Any:
    """Generate applied mental frameworks (Layer 3 - Discipline Frameworks)."""
    print(f"[FORGE-DEBUG] POST /ai/frameworks — user={current_user.id}", flush=True)
    goals_data = _extract_goal_context(current_user)
    try:
        items = await ai_service.generate_frameworks(goals=goals_data, user=current_user)
        print(f"[FORGE-DEBUG] /ai/frameworks — SUCCESS, returned {len(items)} items", flush=True)
        return {"data": items, "count": len(items)}
    except ValueError as e:
        print(f"[FORGE-DEBUG] /ai/frameworks — ValueError: {e}", flush=True)
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        print(f"[FORGE-DEBUG] /ai/frameworks — ConnectionError: {e}", flush=True)
        raise HTTPException(status_code=502, detail=str(e))
