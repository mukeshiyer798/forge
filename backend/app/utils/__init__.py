"""
Utils package - re-exports from email module and adds spaced repetition utilities.
The original app.utils content is in _email.py to avoid circular imports.
"""
from pathlib import Path

# Import from the original utils - we need to handle the utils.py vs utils/ conflict
# By having utils/ package, we shadow utils.py. So we copy the logic here.
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import emails  # type: ignore
import jwt
from jinja2 import Template
from jwt.exceptions import InvalidTokenError

from app.core import security
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EmailData:
    html_content: str
    subject: str


def render_email_template(*, template_name: str, context: dict[str, Any]) -> str:
    # utils/__init__.py is in app/utils/, so parent.parent is app/
    template_path = Path(__file__).parent.parent / "email-templates" / "build" / template_name
    template_str = template_path.read_text()
    html_content = Template(template_str).render(context)
    return html_content


def send_email(
    *,
    email_to: str,
    subject: str = "",
    html_content: str = "",
) -> None:
    assert settings.emails_enabled, "no provided configuration for email variables"

    # ── Brevo (Sendinblue) SDK (preferred) ────────────────
    if settings.BREVO_API_KEY:
        import sib_api_v3_sdk
        from sib_api_v3_sdk.rest import ApiException

        # Configure API key authorization
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = settings.BREVO_API_KEY

        # Create an instance of the API class
        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

        sender_name = settings.EMAILS_FROM_NAME or settings.PROJECT_NAME
        sender_email = settings.EMAILS_FROM_EMAIL or "info@brevo.com"

        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            sender={"name": sender_name, "email": sender_email},
            to=[{"email": email_to}],
            subject=subject,
            html_content=html_content
        )

        try:
            api_response = api_instance.send_transac_email(send_smtp_email)
            logger.info(f"[Brevo SDK] Email sent to {email_to}: {api_response.message_id}")
            return
        except ApiException as e:
            logger.error(f"[Brevo SDK] API Exception: {e}")
            # Fall through
        except Exception as e:
            logger.error(f"[Brevo SDK] Exception: {e}")
            # Fall through

    # ── Mailgun API ──────────────────────────────────────────
    if settings.MAILGUN_API_KEY and settings.MAILGUN_DOMAIN:
        import httpx
# ... (rest of the function continues)
    message = emails.Message(
        subject=subject,
        html=html_content,
        mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
    )
    smtp_options = {"host": settings.SMTP_HOST, "port": settings.SMTP_PORT}
    if settings.SMTP_TLS:
        smtp_options["tls"] = True
    elif settings.SMTP_SSL:
        smtp_options["ssl"] = True
    if settings.SMTP_USER:
        smtp_options["user"] = settings.SMTP_USER
    if settings.SMTP_PASSWORD:
        smtp_options["password"] = settings.SMTP_PASSWORD
    try:
        response = message.send(to=email_to, smtp=smtp_options)
        logger.info(f"[SMTP] Email sent to {email_to}: status_code={response.status_code}, response={response}")
        if response.status_code is None or response.status_code >= 400:
             logger.error(f"[SMTP] Delivery failed for {email_to}")
    except Exception as e:
        logger.error(f"[SMTP] Exception during send to {email_to}: {e}")
        raise RuntimeError(f"SMTP send failed: {e}")


def generate_test_email(email_to: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = settings.EMAIL_SUBJECT_TEST.format(project_name=project_name)
    html_content = render_email_template(
        template_name="test_email.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "email": email_to,
            "dashboard_url": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_reset_password_email(email_to: str, email: str, token: str) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = settings.EMAIL_SUBJECT_RESET_PASSWORD.format(project_name=project_name, email=email)
    link = f"{settings.FRONTEND_HOST}/reset-password?token={token}"
    html_content = render_email_template(
        template_name="reset_password.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": email,
            "email": email_to,
            "valid_hours": settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS,
            "link": link,
            "dashboard_url": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_new_account_email(
    email_to: str, username: str, password: str
) -> EmailData:
    project_name = settings.PROJECT_NAME
    subject = settings.EMAIL_SUBJECT_NEW_ACCOUNT.format(project_name=project_name, username=username)
    html_content = render_email_template(
        template_name="new_account.html",
        context={
            "project_name": settings.PROJECT_NAME,
            "username": username,
            "password": password,
            "email": email_to,
            "link": settings.FRONTEND_HOST,
            "dashboard_url": settings.FRONTEND_HOST,
        },
    )
    return EmailData(html_content=html_content, subject=subject)


def generate_password_reset_token(email: str) -> str:
    delta = timedelta(hours=settings.EMAIL_RESET_TOKEN_EXPIRE_HOURS)
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=security.ALGORITHM,
    )
    return encoded_jwt


def verify_password_reset_token(token: str) -> str | None:
    try:
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        return str(decoded_token["sub"])
    except InvalidTokenError:
        return None
