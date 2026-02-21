import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import col, func, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Goal,
    Message,
    PomodoroSession,
    PomodoroSessionCreate,
    PomodoroSessionPublic,
    PomodoroSessionUpdate,
    PomodoroSessionsPublic,
)

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])


@router.post("/sessions", response_model=PomodoroSessionPublic)
def create_pomodoro_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    session_in: PomodoroSessionCreate,
) -> Any:
    """Start a new pomodoro session."""
    if session_in.goal_id:
        goal = session.get(Goal, session_in.goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if goal.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not enough permissions")

    db_session = PomodoroSession(
        owner_id=current_user.id,
        goal_id=session_in.goal_id,
        topic_id=session_in.topic_id,
        duration=session_in.duration,
        session_type=session_in.session_type,
    )
    session.add(db_session)
    session.commit()
    session.refresh(db_session)
    return db_session


@router.get("/sessions", response_model=PomodoroSessionsPublic)
def read_pomodoro_sessions(
    session: SessionDep,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 50,
) -> Any:
    """Get pomodoro sessions for the current user."""
    count_statement = (
        select(func.count())
        .select_from(PomodoroSession)
        .where(PomodoroSession.owner_id == current_user.id)
    )
    count = session.exec(count_statement).one()

    statement = (
        select(PomodoroSession)
        .where(PomodoroSession.owner_id == current_user.id)
        .order_by(col(PomodoroSession.start_time).desc())
        .offset(skip)
        .limit(limit)
    )
    sessions = session.exec(statement).all()
    return PomodoroSessionsPublic(data=sessions, count=count)


@router.put("/sessions/{id}", response_model=PomodoroSessionPublic)
def update_pomodoro_session(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    session_in: PomodoroSessionUpdate,
) -> Any:
    """Update a pomodoro session (complete, set end_time)."""
    db_session = session.get(PomodoroSession, id)
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_session.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = session_in.model_dump(exclude_unset=True)
    if "end_time" not in update_data and update_data.get("completed"):
        update_data["end_time"] = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(db_session, field, value)

    session.add(db_session)
    session.commit()
    session.refresh(db_session)
    return db_session


@router.get("/stats")
def get_pomodoro_stats(
    session: SessionDep,
    current_user: CurrentUser,
) -> Any:
    """Get pomodoro statistics for the current user."""
    from sqlalchemy import and_

    # Total completed sessions
    sessions_statement = (
        select(PomodoroSession)
        .where(
            and_(
                PomodoroSession.owner_id == current_user.id,
                PomodoroSession.completed == True,
                PomodoroSession.session_type == "focus",
            )
        )
    )
    sessions = session.exec(sessions_statement).all()

    total_minutes = sum(s.duration for s in sessions)
    total_sessions = len(sessions)

    # Count by goal
    goal_counts: dict[str, int] = {}
    for s in sessions:
        if s.goal_id:
            key = str(s.goal_id)
            goal_counts[key] = goal_counts.get(key, 0) + 1

    return {
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "by_goal": goal_counts,
    }
