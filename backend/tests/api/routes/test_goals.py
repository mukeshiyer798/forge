"""Tests for Goal API routes — covers CRUD, limit enforcement, and pause toggle."""
import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.goal import create_random_goal
from tests.utils.user import create_random_user


# ── Helpers ────────────────────────────────────────────────────

def _goal_payload(**overrides) -> dict:
    """Return a minimal valid goal creation payload, merging any overrides."""
    base = {
        "name": "Test Goal",
        "type": "learn",
        "description": "A test learning goal",
        "status": "on-track",
        "priority": 1,
    }
    base.update(overrides)
    return base


# ── CREATE ─────────────────────────────────────────────────────

def test_create_goal(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = _goal_payload(name="Learn Python")
    r = client.post(
        f"{settings.API_V1_STR}/goals/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "Learn Python"
    assert body["type"] == "learn"
    assert body["status"] == "on-track"
    assert "id" in body
    assert "owner_id" in body
    assert "future_look" in body  # new field must be present


def test_create_goal_with_future_look(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    """Verify the future_look field round-trips correctly."""
    future = "You'll be writing production Python in 3 months."
    data = _goal_payload(name="FutureLook test", future_look=future)
    r = client.post(
        f"{settings.API_V1_STR}/goals/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 200
    assert r.json()["future_look"] == future


def test_create_goal_invalid_type(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = _goal_payload(type="invalid_type")
    r = client.post(
        f"{settings.API_V1_STR}/goals/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 400
    assert "Invalid goal type" in r.json()["detail"]


def test_create_goal_invalid_status(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = _goal_payload(status="invalid_status")
    r = client.post(
        f"{settings.API_V1_STR}/goals/",
        headers=superuser_token_headers,
        json=data,
    )
    assert r.status_code == 400
    assert "Invalid status" in r.json()["detail"]


# ── GOAL LIMIT ─────────────────────────────────────────────────

def test_goal_limit_blocks_4th_active_goal(
    client: TestClient, db: Session
) -> None:
    """Creating more than MAX_ACTIVE_GOALS active goals returns 400."""
    user = create_random_user(db)

    from tests.utils.user import user_authentication_headers
    headers = user_authentication_headers(
        client=client, email=user.email, password="testpassword"
    )

    # This test needs a user with a known password; create one explicitly.
    from app import crud
    from app.models import UserUpdate
    crud.update_user(session=db, db_user=user, user_in=UserUpdate(password="testpassword"))
    headers = user_authentication_headers(
        client=client, email=user.email, password="testpassword"
    )

    # Create MAX_ACTIVE_GOALS goals (should succeed)
    for i in range(settings.MAX_ACTIVE_GOALS):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=headers,
            json=_goal_payload(name=f"Goal {i+1}"),
        )
        assert r.status_code == 200, f"Goal {i+1} creation failed: {r.text}"

    # The next one should be blocked
    r = client.post(
        f"{settings.API_V1_STR}/goals/",
        headers=headers,
        json=_goal_payload(name="Goal over limit"),
    )
    assert r.status_code == 400
    assert r.json()["detail"] == "Focus on one thing at a time"


def test_paused_goal_excluded_from_limit(
    client: TestClient, db: Session
) -> None:
    """Pausing a goal frees up a slot, allowing a new goal to be created."""
    user = create_random_user(db)

    from app import crud
    from app.models import UserUpdate
    crud.update_user(session=db, db_user=user, user_in=UserUpdate(password="testpassword2"))

    from tests.utils.user import user_authentication_headers
    headers = user_authentication_headers(
        client=client, email=user.email, password="testpassword2"
    )

    # Create MAX_ACTIVE_GOALS goals
    goal_ids = []
    for i in range(settings.MAX_ACTIVE_GOALS):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=headers,
            json=_goal_payload(name=f"Limit Goal {i+1}"),
        )
        assert r.status_code == 200
        goal_ids.append(r.json()["id"])

    # Pause one goal
    r = client.patch(
        f"{settings.API_V1_STR}/goals/{goal_ids[0]}/pause",
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "paused"

    # Now creating another goal should succeed
    r = client.post(
        f"{settings.API_V1_STR}/goals/",
        headers=headers,
        json=_goal_payload(name="After pause goal"),
    )
    assert r.status_code == 200


# ── PAUSE TOGGLE ───────────────────────────────────────────────

def test_toggle_pause_goal(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """PATCH /{id}/pause toggles between paused and on-track."""
    # Create a goal
    r = client.post(
        f"{settings.API_V1_STR}/goals/",
        headers=superuser_token_headers,
        json=_goal_payload(name="Toggle test"),
    )
    goal_id = r.json()["id"]

    # First toggle → paused
    r = client.patch(
        f"{settings.API_V1_STR}/goals/{goal_id}/pause",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "paused"

    # Second toggle → on-track
    r = client.patch(
        f"{settings.API_V1_STR}/goals/{goal_id}/pause",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "on-track"


def test_toggle_pause_nonexistent_goal(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.patch(
        f"{settings.API_V1_STR}/goals/{uuid.uuid4()}/pause",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


# ── READ ───────────────────────────────────────────────────────

def test_read_goals(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_goal(db)
    r = client.get(
        f"{settings.API_V1_STR}/goals/",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert "data" in body
    assert "count" in body
    assert body["count"] >= 1


def test_read_goal_by_id(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    goal = create_random_goal(db)
    r = client.get(
        f"{settings.API_V1_STR}/goals/{goal.id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["id"] == str(goal.id)


def test_read_goal_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.get(
        f"{settings.API_V1_STR}/goals/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404


def test_read_goal_not_enough_permissions(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    goal = create_random_goal(db)
    r = client.get(
        f"{settings.API_V1_STR}/goals/{goal.id}",
        headers=normal_user_token_headers,
    )
    assert r.status_code == 403


# ── UPDATE ─────────────────────────────────────────────────────

def test_update_goal(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    goal = create_random_goal(db)
    r = client.put(
        f"{settings.API_V1_STR}/goals/{goal.id}",
        headers=superuser_token_headers,
        json={"name": "Updated name", "description": "Updated desc"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "Updated name"


def test_update_goal_with_paused_status(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    """Verify that setting status='paused' via PUT succeeds (was broken before fix)."""
    goal = create_random_goal(db)
    r = client.put(
        f"{settings.API_V1_STR}/goals/{goal.id}",
        headers=superuser_token_headers,
        json={"status": "paused"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "paused"


def test_update_goal_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.put(
        f"{settings.API_V1_STR}/goals/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json={"name": "nope"},
    )
    assert r.status_code == 404


# ── DELETE ─────────────────────────────────────────────────────

def test_delete_goal(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    goal = create_random_goal(db)
    r = client.delete(
        f"{settings.API_V1_STR}/goals/{goal.id}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 200
    assert r.json()["message"] == "Goal deleted successfully"


def test_delete_goal_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    r = client.delete(
        f"{settings.API_V1_STR}/goals/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert r.status_code == 404
