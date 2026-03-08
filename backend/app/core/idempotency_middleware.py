import orjson
from    typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlmodel import Session, select

from app.core.db import engine
from app.entities.idempotency import IdempotencyRecord
import logging

logger = logging.getLogger(__name__)

class IdempotencyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        idempotency_key = request.headers.get("Idempotency-Key")
        
        # Only process mutating requests that provide a key
        if not idempotency_key or request.method not in ["POST", "PUT", "PATCH", "DELETE"]:
            return await call_next(request)

        # 1. Check if the key already exists
        with Session(engine) as session:
            record = session.exec(
                select(IdempotencyRecord).where(IdempotencyRecord.idempotency_key == idempotency_key)
            ).first()

            if record:
                logger.info(f"Idempotency hit for key: {idempotency_key}. Returning cached response.")
                try:
                    cached_body = orjson.loads(record.response_body)
                except orjson.JSONDecodeError:
                    cached_body = record.response_body
                
                return JSONResponse(content=cached_body, status_code=record.status_code)

        # 2. Key not found. Proceed with the request
        response = await call_next(request)
        
        # We only cache successful mutating requests (2xx status codes) to avoid caching client errors permanently
        if 200 <= response.status_code < 300:
            # We must consume the response body to save it, so we iterate and reconstruct it
            body_chunks = []
            async for chunk in response.body_iterator:
                body_chunks.append(chunk)
            
            raw_body = b"".join(body_chunks)
            
            # Reconstruct the response with the body we just consumed
            from starlette.responses import StreamingResponse
            
            async def new_body_iterator():
                yield raw_body

            response = StreamingResponse(
                new_body_iterator(), 
                status_code=response.status_code, 
                headers=dict(response.headers)
            )

            # Extract user_id if authenticated, else use a placeholder or skip caching
            # It's safer to extract user_id downstream in a route dependency, but since this is middleware
            # we do a best-effort. If the user isn't found in state, we might skip caching or store null.
            # In FastAPI, `request.user` requires AuthenticationMiddleware, which we might not have in the same order.
            
            # To avoid the complexity of parsing the JWT in middleware, we'll try to get it from request state
            # If not possible, we use a placeholder UUID (all zeros) for anonymous idempotent requests
            import uuid
            user_id = getattr(request.state, "user_id", None)
            if not user_id:
                user_id = uuid.UUID(int=0)

            try:
                decoded_body = raw_body.decode("utf-8")
                with Session(engine) as session:
                    new_record = IdempotencyRecord(
                        idempotency_key=idempotency_key,
                        user_id=user_id,
                        path=request.url.path,
                        status_code=response.status_code,
                        response_body=decoded_body
                    )
                    session.add(new_record)
                    session.commit()
            except Exception as e:
                logger.error(f"Failed to save idempotency record for key {idempotency_key}: {e}")

        return response
