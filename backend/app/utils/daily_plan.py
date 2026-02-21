"""
Generate daily plan data for email templates.
"""

from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, select

from app.models import Goal, SpacedRepetitionItem, User


def get_todays_plan(session: Session, user: User) -> dict[str, Any]:
    """Aggregate today's plan data for a user."""
    now = datetime.now(timezone.utc)
    today_str = now.date().isoformat()

    # Goals with daily task requirement
    goals_statement = select(Goal).where(Goal.owner_id == user.id)
    goals = list(session.exec(goals_statement).all())

    goals_data: list[dict[str, Any]] = []
    for g in goals:
        tasks_today = g.daily_task_requirement or 0
        if tasks_today > 0:
            goals_data.append({
                "name": g.name,
                "tasks_today": tasks_today,
            })

    # Spaced repetition items due today
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    sr_statement = (
        select(SpacedRepetitionItem)
        .where(SpacedRepetitionItem.owner_id == user.id)
        .where(SpacedRepetitionItem.next_review_at <= end_of_day)
    )
    sr_items = list(session.exec(sr_statement).all())
    spaced_repetition_count = len(sr_items)

    # Streak (simplified - would need week_data from frontend/store)
    streak = 0  # TODO: get from user's week_data if we store it

    return {
        "goals": goals_data,
        "spaced_repetition_count": spaced_repetition_count,
        "streak": streak,
    }


def get_afternoon_data(session: Session, user: User) -> dict[str, Any]:
    """Data for afternoon check-in email."""
    plan = get_todays_plan(session, user)
    # Simplified: we don't track per-task completion in backend yet
    completed_count = 0
    total_count = sum(g.get("tasks_today", 0) for g in plan["goals"])
    remaining_tasks = [g["name"] for g in plan["goals"]]
    return {
        **plan,
        "completed_count": completed_count,
        "total_count": total_count,
        "remaining_tasks": remaining_tasks,
    }


def get_evening_data(session: Session, user: User) -> dict[str, Any]:
    """Data for evening email (celebration or nudge)."""
    plan = get_todays_plan(session, user)
    # Simplified: assume not all done for nudge variant
    all_done = False  # TODO: check actual completion
    remaining_count = sum(g.get("tasks_today", 0) for g in plan["goals"])
    tomorrow_goals = [g["name"] for g in plan["goals"]]
    return {
        **plan,
        "all_done": all_done,
        "remaining_count": remaining_count,
        "tomorrow_goals": tomorrow_goals,
    }
