from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings

# Initialize global rate limiter: 100 requests per minute per IP
# Disable during tests or local development if needed
limiter = Limiter(
    key_func=get_remote_address, 
    default_limits=["100/minute"],
    enabled=settings.ENVIRONMENT != "local"
)
