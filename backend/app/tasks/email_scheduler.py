"""
Scheduled tasks for sending daily plan emails.
Uses APScheduler - runs every 15 minutes and checks each user's
local time to determine whether to send morning/afternoon/evening emails.
Respects per-user timezone and preferred email times.
"""

import logging
from datetime import datetime, timezone

try:
    from zoneinfo import ZoneInfo
except ImportError:
    from backports.zoneinfo import ZoneInfo  # type: ignore

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
except ModuleNotFoundError:  # pragma: no cover - fallback for missing optional dependency
    BackgroundScheduler = None  # type: ignore[assignment]
    IntervalTrigger = None  # type: ignore[assignment]
    logging.getLogger(__name__).warning(
        "APScheduler is not installed; email scheduler is disabled."
    )
from sqlmodel import Session, select

from app.core.config import settings
from app.core.db import engine
from app.models import User
from app.utils import render_email_template, send_email
from app.utils.daily_plan import get_afternoon_data, get_evening_data, get_todays_plan

logger = logging.getLogger(__name__)

# Quotes for morning email
QUOTES = [
    {"text": "The only way to do great work is to love what you do.", "author": "Steve Jobs"},
    {"text": "Consistency is the key to achieving your goals.", "author": "Unknown"},
    {"text": "Small daily improvements over time lead to stunning results.", "author": "Robin Sharma"},
    {"text": "You do not rise to the level of your goals. You fall to the level of your systems.", "author": "James Clear"},
    {"text": "The impediment to action advances action. What stands in the way becomes the way.", "author": "Marcus Aurelius"},
]

# Track which emails have been sent today per user to avoid duplicates
_sent_today: dict[str, set[str]] = {}  # date_str -> set of "user_id:slot"


def _get_user_local_time(user: User) -> datetime:
    """Get the current time in the user's configured timezone."""
    try:
        tz = ZoneInfo(user.timezone or "UTC")
    except (KeyError, ValueError):
        tz = ZoneInfo("UTC")
    return datetime.now(tz)


def _parse_time(time_str: str) -> tuple[int, int]:
    """Parse 'HH:MM' string to (hour, minute) tuple."""
    try:
        parts = time_str.split(":")
        return int(parts[0]), int(parts[1])
    except (ValueError, IndexError):
        return 7, 0


def _is_time_in_window(local_now: datetime, target_hour: int, target_minute: int, window_minutes: int = 15) -> bool:
    """Check if local_now is within window_minutes of target time."""
    target_total = target_hour * 60 + target_minute
    current_total = local_now.hour * 60 + local_now.minute
    return 0 <= (current_total - target_total) < window_minutes


def _get_sent_key(user_id: str, slot: str) -> str:
    return f"{user_id}:{slot}"


def _check_and_send_emails() -> None:
    """
    Run every 15 minutes. For each user, check their local time
    and send the appropriate email (morning/afternoon/evening).
    """
    if not settings.emails_enabled:
        return

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Reset tracking at midnight UTC
    global _sent_today
    if today_str not in _sent_today:
        _sent_today = {today_str: set()}
    sent = _sent_today[today_str]

    with Session(engine) as session:
        statement = select(User).where(
            User.is_active == True,
            User.email_daily_plan_enabled == True,
        )
        users = list(session.exec(statement).all())

        for user in users:
            user_id = str(user.id)
            local_now = _get_user_local_time(user)

            morning_h, morning_m = _parse_time(user.email_morning_time or settings.DEFAULT_EMAIL_MORNING_TIME)
            afternoon_h, afternoon_m = _parse_time(user.email_afternoon_time or settings.DEFAULT_EMAIL_AFTERNOON_TIME)
            evening_h, evening_m = _parse_time(user.email_evening_time or settings.DEFAULT_EMAIL_EVENING_TIME)

            # Morning email
            morning_key = _get_sent_key(user_id, "morning")
            if morning_key not in sent and _is_time_in_window(local_now, morning_h, morning_m):
                try:
                    _send_morning_email(session, user)
                    sent.add(morning_key)
                    logger.info(f"Sent morning email to {user.email} (local: {local_now.strftime('%H:%M')})")
                except Exception as e:
                    logger.exception(f"Failed morning email to {user.email}: {e}")

            # Afternoon email
            afternoon_key = _get_sent_key(user_id, "afternoon")
            if afternoon_key not in sent and _is_time_in_window(local_now, afternoon_h, afternoon_m):
                try:
                    _send_afternoon_email(session, user)
                    sent.add(afternoon_key)
                    logger.info(f"Sent afternoon email to {user.email} (local: {local_now.strftime('%H:%M')})")
                except Exception as e:
                    logger.exception(f"Failed afternoon email to {user.email}: {e}")

            # Evening email
            evening_key = _get_sent_key(user_id, "evening")
            if evening_key not in sent and _is_time_in_window(local_now, evening_h, evening_m):
                try:
                    _send_evening_email(session, user)
                    sent.add(evening_key)
                    logger.info(f"Sent evening email to {user.email} (local: {local_now.strftime('%H:%M')})")
                except Exception as e:
                    logger.exception(f"Failed evening email to {user.email}: {e}")


def _send_morning_email(session: Session, user: User) -> None:
    plan = get_todays_plan(session, user)
    user_name = user.greeting_preference or user.full_name or user.email.split("@")[0]
    context = {
        "project_name": settings.PROJECT_NAME,
        "user_name": user_name,
        "goals": plan["goals"],
        "spaced_repetition_count": plan["spaced_repetition_count"],
        "quote": QUOTES[hash(user.email) % len(QUOTES)] if QUOTES else None,
        "dashboard_url": settings.FRONTEND_HOST or "https://dashboard.example.com",
    }
    html = render_email_template(template_name="daily_plan_morning.html", context=context)
    send_email(
        email_to=user.email,
        subject=f"{settings.PROJECT_NAME} - Your plan for today",
        html_content=html,
    )


def _send_afternoon_email(session: Session, user: User) -> None:
    data = get_afternoon_data(session, user)
    user_name = user.greeting_preference or user.full_name or user.email.split("@")[0]
    context = {
        "project_name": settings.PROJECT_NAME,
        "user_name": user_name,
        **data,
        "dashboard_url": settings.FRONTEND_HOST or "https://dashboard.example.com",
    }
    html = render_email_template(template_name="daily_plan_afternoon.html", context=context)
    send_email(
        email_to=user.email,
        subject=f"{settings.PROJECT_NAME} - Afternoon check-in",
        html_content=html,
    )


def _send_evening_email(session: Session, user: User) -> None:
    data = get_evening_data(session, user)
    user_name = user.greeting_preference or user.full_name or user.email.split("@")[0]
    subject = "You did it!" if data["all_done"] else "The day isn't over yet"
    context = {
        "project_name": settings.PROJECT_NAME,
        "user_name": user_name,
        "subject_line": subject,
        **data,
        "dashboard_url": settings.FRONTEND_HOST or "https://dashboard.example.com",
    }
    html = render_email_template(template_name="daily_plan_evening.html", context=context)
    send_email(
        email_to=user.email,
        subject=f"{settings.PROJECT_NAME} - {subject}",
        html_content=html,
    )


_scheduler = None


def start_email_scheduler() -> None:
    """Start the background scheduler for daily plan emails."""
    global _scheduler
    if BackgroundScheduler is None or IntervalTrigger is None:
        logger.warning("Email scheduler not started because APScheduler is missing.")
        return
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler()
    # Run every 15 minutes — checks each user's local timezone to decide what to send
    _scheduler.add_job(
        _check_and_send_emails,
        IntervalTrigger(minutes=15),
        id="email_check",
        max_instances=1,
    )
    _scheduler.start()
    logger.info("Email scheduler started (checking every 15 minutes)")


def stop_email_scheduler() -> None:
    """Stop the email scheduler."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("Email scheduler stopped")

