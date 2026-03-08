from fastapi import APIRouter, Depends
from pydantic.networks import EmailStr

from app.api.deps import get_current_active_superuser, SessionDep, CurrentUser
from app.models import Message
from app.core.logging import get_logger
from app.utils import generate_test_email, send_email

logger = get_logger("routes.utils")

router = APIRouter(prefix="/utils", tags=["utils"])


from pydantic import BaseModel

class EmailTestRequest(BaseModel):
    email_to: EmailStr

@router.post(
    "/test-email/",
    status_code=201,
)
def test_email(
    request: EmailTestRequest,
    current_user: CurrentUser,
) -> Message:
    """
    Test emails.
    """
    email_to = request.email_to
    logger.info("route.utils.test_email", extra={
        "email_to_domain": email_to.split("@")[-1],
        "user_id": str(current_user.id) if hasattr(current_user, 'id') else "unknown",
    })
    email_data = generate_test_email(email_to=email_to)
    send_email(
        email_to=email_to,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Test email sent")


@router.get("/health-check/")
async def health_check() -> bool:
    return True


@router.post(
    "/test-morning-email/",
    status_code=201,
)
def test_morning_email(
    session: SessionDep,
    current_user: CurrentUser,
) -> Message:
    """Send the morning plan email to yourself for testing."""
    from app.tasks.email_scheduler import _send_morning_email
    _send_morning_email(session, current_user)
    return Message(message="Morning email sent")
