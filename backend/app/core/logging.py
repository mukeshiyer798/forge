"""
Structured JSON logging with per-request context propagation.

Context vars (request_id, session_id, user_id) are set once per request
in RequestLoggingMiddleware and automatically injected into every log
record via RequestContextFilter.
"""

import logging
import sys
from contextvars import ContextVar

from pythonjsonlogger import jsonlogger

# ── Context vars: set per-request, readable anywhere in the call stack ──
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")
session_id_ctx: ContextVar[str] = ContextVar("session_id", default="")
user_id_ctx: ContextVar[str] = ContextVar("user_id", default="")


class RequestContextFilter(logging.Filter):
    """Injects request_id, session_id, user_id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()  # noqa: attr-defined
        record.session_id = session_id_ctx.get()  # noqa: attr-defined
        record.user_id = user_id_ctx.get()  # noqa: attr-defined
        return True


def setup_logging(level: str = "INFO") -> None:
    """Configure the root logger with JSON output + context injection."""
    handler = logging.StreamHandler(sys.stdout)
    formatter = jsonlogger.JsonFormatter(
        "%(asctime)s %(levelname)s %(name)s %(message)s "
        "%(request_id)s %(session_id)s %(user_id)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)
    handler.addFilter(RequestContextFilter())

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.addHandler(handler)

    # Silence noisy third-party loggers
    for noisy in ("uvicorn.access", "httpx", "httpcore", "watchfiles"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger. Use __name__ for automatic module-scoped naming."""
    return logging.getLogger(name)
