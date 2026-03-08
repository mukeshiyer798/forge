from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.api.deps import CurrentUser, AiServiceDep, UserServiceDep
from app.core.rate_limit import limiter
from app.core.logging import get_logger

logger = get_logger("routes.ai")

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
    logger.info("route.ai.test.started", extra={"user_id": str(current_user.id)})
    key_to_test = test_request.api_key

    if key_to_test:
        from app.models.user import UserUpdateMe
        user_in = UserUpdateMe(openrouter_api_key=key_to_test)
        user_service.update_me(db_user=current_user, user_in=user_in)
        logger.info("route.ai.test.key_saved", extra={"user_id": str(current_user.id)})
    else:
        from app.core.security import decrypt_api_key
        key_to_test = decrypt_api_key(current_user.encrypted_openrouter_key)
        logger.debug("route.ai.test.using_stored_key", extra={
            "user_id": str(current_user.id),
            "key_exists": bool(key_to_test),
        })

    if not key_to_test:
        logger.warning("route.ai.test.no_key", extra={"user_id": str(current_user.id)})
        return {"ok": False}

    is_valid = await ai_service.test_key(api_key=key_to_test)
    logger.info("route.ai.test.completed", extra={
        "user_id": str(current_user.id),
        "result": is_valid,
    })
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
    logger.info("route.ai.generate.started", extra={
        "user_id": str(current_user.id),
        "model": ai_request.model,
        "prompt_len": len(ai_request.prompt),
    })
    if ai_request.api_key:
        from app.models.user import UserUpdateMe
        user_in = UserUpdateMe(openrouter_api_key=ai_request.api_key)
        user_service.update_me(db_user=current_user, user_in=user_in)
        logger.info("route.ai.generate.key_saved", extra={"user_id": str(current_user.id)})

    try:
        response = await ai_service.generate_response(
            prompt=ai_request.prompt,
            user=current_user,
            model=ai_request.model or "google/gemini-2.0-flash-001",
            api_key_override=ai_request.api_key or None
        )
        logger.info("route.ai.generate.success", extra={"user_id": str(current_user.id)})
        return response
    except ValueError as e:
        logger.warning("route.ai.generate.value_error", extra={
            "user_id": str(current_user.id),
            "error": str(e)[:200],
        })
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        logger.error("route.ai.generate.connection_error", extra={
            "user_id": str(current_user.id),
            "error": str(e)[:200],
        })
        raise HTTPException(status_code=502, detail=str(e))
    except RuntimeError as e:
        logger.error("route.ai.generate.runtime_error", extra={
            "user_id": str(current_user.id),
            "error": str(e)[:200],
        })
        raise HTTPException(status_code=500, detail=str(e))


def _extract_goal_context(user) -> list[dict]:
    """Extract goal data with current phase and active topics for AI prompts."""
    goals_data = []
    for g in user.goals:
        import orjson as _json
        topics = []
        current_phase = 1
        current_topics = []
        try:
            topics = _json.loads(g.topics) if g.topics else []
        except (ValueError, TypeError, _json.JSONDecodeError):
            topics = []

        if topics:
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
    logger.info("route.ai.intelligence_feed.started", extra={
        "user_id": str(current_user.id),
        "goal_count": len(current_user.goals),
        "has_keywords": bool(current_user.intelligence_keywords),
    })
    goals_data = _extract_goal_context(current_user)
    try:
        items = await ai_service.generate_intelligence_feed(
            goals=goals_data,
            keywords=current_user.intelligence_keywords,
            user=current_user
        )
        logger.info("route.ai.intelligence_feed.success", extra={
            "user_id": str(current_user.id),
            "item_count": len(items),
        })
        return {"data": items, "count": len(items)}
    except ValueError as e:
        logger.warning("route.ai.intelligence_feed.error", extra={"error": str(e)[:200]})
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        logger.error("route.ai.intelligence_feed.connection_error", extra={"error": str(e)[:200]})
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/frameworks")
@limiter.limit("10/minute")
async def generate_frameworks(
    request: Request,
    current_user: CurrentUser,
    ai_service: AiServiceDep,
) -> Any:
    """Generate applied mental frameworks (Layer 3 - Discipline Frameworks)."""
    logger.info("route.ai.frameworks.started", extra={"user_id": str(current_user.id)})
    goals_data = _extract_goal_context(current_user)
    try:
        items = await ai_service.generate_frameworks(goals=goals_data, user=current_user)
        logger.info("route.ai.frameworks.success", extra={
            "user_id": str(current_user.id),
            "item_count": len(items),
        })
        return {"data": items, "count": len(items)}
    except ValueError as e:
        logger.warning("route.ai.frameworks.error", extra={"error": str(e)[:200]})
        raise HTTPException(status_code=400, detail=str(e))
    except ConnectionError as e:
        logger.error("route.ai.frameworks.connection_error", extra={"error": str(e)[:200]})
        raise HTTPException(status_code=502, detail=str(e))
