"""
Request logging middleware — the session correlation core.

Generates a unique request_id per request, reads the session_id from
the x-session-id header (sent by the frontend), and propagates both
via context vars so every downstream logger includes them automatically.
"""

import time
import uuid

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import (
    get_logger,
    request_id_ctx,
    session_id_ctx,
    user_id_ctx,
)

logger = get_logger("middleware.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # noqa: ANN001
        # 1. Generate or inherit IDs
        request_id = str(uuid.uuid4())
        session_id = request.headers.get("x-session-id", "")

        # 2. Set context vars — available anywhere downstream
        request_id_ctx.set(request_id)
        session_id_ctx.set(session_id)
        # user_id is set later in deps.py after auth resolves

        # 3. Request timing
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.error(
                "request.unhandled_exception",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": duration_ms,
                },
                exc_info=True,
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        # 4. Structured access log
        log_level = "warning" if response.status_code >= 400 else "info"
        getattr(logger, log_level)(
            "request.completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )

        # 5. Echo IDs back to frontend for correlation
        response.headers["x-request-id"] = request_id
        return response
