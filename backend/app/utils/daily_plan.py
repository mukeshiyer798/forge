"""
Generate daily plan data for email templates.
"""

import orjson
import logging
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, select

from app.models import Goal, SpacedRepetitionItem, User

logger = logging.getLogger(__name__)


def _parse_json_field(raw: str | None) -> Any:
    """Safely parse a JSON string field, returning [] or {} on error."""
    if not raw:
        return []
    try:
        return orjson.loads(raw)
    except (orjson.JSONDecodeError, TypeError):
        return []


def get_todays_plan(session: Session, user: User) -> dict[str, Any]:
    """Aggregate today's plan data for a user with full topic detail."""
    now = datetime.now(timezone.utc)

    # Fetch all goals, ordered by priority
    goals_statement = select(Goal).where(Goal.owner_id == user.id)
    goals = list(session.exec(goals_statement).all())

    # Sort: priority first (lower = higher priority), then by name
    goals.sort(key=lambda g: (g.priority or 999, g.name or ""))

    goals_data: list[dict[str, Any]] = []
    total_reading_list: list[dict[str, Any]] = []

    for g in goals:
        # Skip paused goals
        if g.status == "paused":
            continue

        topics = _parse_json_field(g.topics)
        tasks_today = g.daily_task_requirement or 0

        # Extract current (incomplete) topics with their subtasks and resources
        current_topics: list[dict[str, Any]] = []
        for t in topics:
            if t.get("completed", False):
                continue
            # Subtopics
            subtopics = [
                {"name": st.get("name", ""), "completed": st.get("completed", False)}
                for st in t.get("subtopics", [])
            ]
            # Resources
            resources = [
                {
                    "title": r.get("title", ""),
                    "type": r.get("type", "article"),
                    "url": r.get("url"),
                }
                for r in t.get("resources", [])
            ]
            # Collect for reading list
            for r in resources:
                if r.get("url"):
                    total_reading_list.append({
                        "title": r["title"],
                        "type": r["type"],
                        "url": r["url"],
                        "goal": g.name,
                    })

            current_topics.append({
                "name": t.get("name", ""),
                "description": t.get("description", ""),
                "subtopics": subtopics,
                "resources": resources,
            })
            
            task_limit = tasks_today if tasks_today > 0 else 3
            if len(current_topics) >= task_limit:  # Limit topics based on daily requirement
                break

        goals_data.append({
            "name": g.name,
            "description": g.description or "",
            "priority": g.priority,
            "status": g.status,
            "progress": g.progress or 0,
            "tasks_today": tasks_today,
            "topics": current_topics,
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
    spaced_repetition_topics = [
        {"topic_name": item.topic_name, "goal_id": str(item.goal_id)}
        for item in sr_items
    ]

    return {
        "goals": goals_data,
        "spaced_repetition_count": spaced_repetition_count,
        "spaced_repetition_topics": spaced_repetition_topics,
        "reading_list": total_reading_list[:10],  # Top 10 readings
        "streak": 0,
    }


def get_afternoon_data(session: Session, user: User) -> dict[str, Any]:
    """Data for afternoon check-in email."""
    plan = get_todays_plan(session, user)
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
    all_done = False
    remaining_count = sum(g.get("tasks_today", 0) for g in plan["goals"])
    tomorrow_goals = [g["name"] for g in plan["goals"]]
    return {
        **plan,
        "all_done": all_done,
        "remaining_count": remaining_count,
        "tomorrow_goals": tomorrow_goals,
    }
