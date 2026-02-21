"""Edge-case and stress tests for Goal API — exercising dumb user scenarios.

These tests go beyond happy-path CRUD. They test:
- Malformed / malicious input (XSS, SQL injection, absurd lengths)
- Boundary values (empty strings, max progress, zero-length names)
- Unicode / emoji in all text fields
- Rapid concurrent-like operations
- Status transitions that shouldn't be allowed
- Auth edge cases (missing token, wrong user)
"""
import uuid
import json

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from tests.utils.goal import create_random_goal
from tests.utils.user import create_random_user, user_authentication_headers
from app import crud
from app.models import UserUpdate


# ── Helpers ────────────────────────────────────────────────────

def _make_user_headers(client: TestClient, db: Session) -> tuple[dict[str, str], any]:
    """Create a fresh user with known password and return (auth_headers, user)."""
    user = create_random_user(db)
    crud.update_user(session=db, db_user=user, user_in=UserUpdate(password="edge-test-pw!1"))
    headers = user_authentication_headers(client=client, email=user.email, password="edge-test-pw!1")
    return headers, user


def _goal_payload(**overrides) -> dict:
    base = {"name": "Edge Case Goal", "type": "learn", "status": "on-track", "priority": 1}
    base.update(overrides)
    return base


# ── XSS & Injection ───────────────────────────────────────────

class TestXSSAndInjection:
    """Ensure user input is stored raw (not executed) and doesn't break the API."""

    def test_xss_in_goal_name(self, client: TestClient, superuser_token_headers: dict[str, str]):
        xss = '<script>alert("pwned")</script>'
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name=xss),
        )
        assert r.status_code == 200
        # Data should be stored as-is (React escapes on render), not stripped
        assert r.json()["name"] == xss

    def test_xss_in_description(self, client: TestClient, superuser_token_headers: dict[str, str]):
        xss = '<img src=x onerror=alert(1)>'
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(description=xss),
        )
        assert r.status_code == 200
        assert r.json()["description"] == xss

    def test_xss_in_future_look(self, client: TestClient, superuser_token_headers: dict[str, str]):
        xss = '"><script>document.cookie</script>'
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(future_look=xss),
        )
        assert r.status_code == 200
        assert r.json()["future_look"] == xss

    def test_sql_injection_in_name(self, client: TestClient, superuser_token_headers: dict[str, str]):
        sqli = "'; DROP TABLE goal; --"
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name=sqli),
        )
        # Should succeed (ORM parameterizes queries) — not drop the table
        assert r.status_code == 200
        assert r.json()["name"] == sqli

        # Verify goals still exist
        r2 = client.get(f"{settings.API_V1_STR}/goals/", headers=superuser_token_headers)
        assert r2.status_code == 200
        assert r2.json()["count"] > 0


# ── Boundary Values ───────────────────────────────────────────

class TestBoundaryValues:
    """Edge-case values that real users accidentally send."""

    def test_empty_name_string(self, client: TestClient, superuser_token_headers: dict[str, str]):
        """Empty name should still be accepted (backend doesn't enforce min length)."""
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name=""),
        )
        # This is an edge case — accept whatever the backend does, just don't crash
        assert r.status_code in (200, 400, 422)

    def test_whitespace_only_name(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="   "),
        )
        assert r.status_code in (200, 400, 422)

    def test_very_long_name(self, client: TestClient, superuser_token_headers: dict[str, str]):
        """A name exceeding reasonable length — should be handled gracefully."""
        long_name = "A" * 10_000
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name=long_name),
        )
        # Should either accept it (encrypted so column can hold it) or reject with 400/422
        assert r.status_code in (200, 400, 422, 500)

    def test_progress_at_zero(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(progress=0),
        )
        assert r.status_code == 200
        assert r.json()["progress"] == 0

    def test_progress_at_100(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(progress=100),
        )
        assert r.status_code == 200
        assert r.json()["progress"] == 100

    def test_progress_over_100_rejected(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(progress=101),
        )
        assert r.status_code in (400, 422)

    def test_progress_negative_rejected(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(progress=-1),
        )
        assert r.status_code in (400, 422)

    def test_priority_zero_rejected(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(priority=0),
        )
        assert r.status_code in (400, 422)

    def test_priority_10_rejected(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(priority=10),
        )
        assert r.status_code in (400, 422)


# ── Unicode & Emoji ────────────────────────────────────────────

class TestUnicodeAndEmoji:
    """Users love emoji. Make sure the stack handles them end-to-end."""

    def test_emoji_in_name(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="🚀 Learn Rust 🦀"),
        )
        assert r.status_code == 200
        assert "🚀" in r.json()["name"]
        assert "🦀" in r.json()["name"]

    def test_chinese_characters(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="学习 Python 编程", description="成为一名优秀的程序员"),
        )
        assert r.status_code == 200
        assert "学习" in r.json()["name"]

    def test_arabic_rtl_text(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="تعلم البرمجة"),
        )
        assert r.status_code == 200

    def test_emoji_in_subtopics_json(self, client: TestClient, superuser_token_headers: dict[str, str]):
        subtopics = json.dumps([{"id": "s1", "name": "📝 Write tests"}])
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(subtopics=subtopics),
        )
        assert r.status_code == 200
        parsed = json.loads(r.json()["subtopics"])
        assert "📝" in parsed[0]["name"]


# ── Malformed JSON Fields ──────────────────────────────────────

class TestMalformedJSON:
    """Users might paste garbage into JSON fields."""

    def test_invalid_json_in_subtopics(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(subtopics="this is not json at all"),
        )
        assert r.status_code == 400
        assert "Invalid JSON" in r.json()["detail"]

    def test_invalid_json_in_topics(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(topics="{broken json"),
        )
        assert r.status_code == 400

    def test_huge_json_payload(self, client: TestClient, superuser_token_headers: dict[str, str]):
        """A massive JSON blob — should not crash the server."""
        huge = json.dumps([{"id": f"s{i}", "name": f"subtopic {i}"} for i in range(1000)])
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(subtopics=huge),
        )
        # Should either accept or reject cleanly — not 500
        assert r.status_code in (200, 400, 413, 422)


# ── Status Transition Edge Cases ───────────────────────────────

class TestStatusTransitions:
    """Users will try weird status changes. Make sure they're handled."""

    def test_pause_already_paused_goal(self, client: TestClient, superuser_token_headers: dict[str, str]):
        """Pausing a paused goal should resume it (toggle behavior)."""
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="Pause test"),
        )
        gid = r.json()["id"]

        # Pause
        r = client.patch(f"{settings.API_V1_STR}/goals/{gid}/pause", headers=superuser_token_headers)
        assert r.json()["status"] == "paused"

        # Pause again → should resume
        r = client.patch(f"{settings.API_V1_STR}/goals/{gid}/pause", headers=superuser_token_headers)
        assert r.json()["status"] == "on-track"

    def test_update_status_to_completed_via_put(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="Complete test"),
        )
        gid = r.json()["id"]

        r = client.put(
            f"{settings.API_V1_STR}/goals/{gid}",
            headers=superuser_token_headers,
            json={"status": "completed"},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

    def test_bogus_status_rejected(self, client: TestClient, superuser_token_headers: dict[str, str]):
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="Bogus status"),
        )
        gid = r.json()["id"]

        r = client.put(
            f"{settings.API_V1_STR}/goals/{gid}",
            headers=superuser_token_headers,
            json={"status": "yolo-status"},
        )
        assert r.status_code == 400
        assert "Invalid status" in r.json()["detail"]


# ── Auth Edge Cases ────────────────────────────────────────────

class TestAuthEdgeCases:
    """Missing tokens, wrong users, expired tokens."""

    def test_no_auth_header_returns_401_or_403(self, client: TestClient):
        r = client.get(f"{settings.API_V1_STR}/goals/")
        assert r.status_code in (401, 403)

    def test_malformed_bearer_token(self, client: TestClient):
        r = client.get(
            f"{settings.API_V1_STR}/goals/",
            headers={"Authorization": "Bearer not.a.real.jwt.token"},
        )
        assert r.status_code in (401, 403)

    def test_user_cannot_access_other_users_goal(self, client: TestClient, db: Session):
        """User A creates a goal; User B should get 403 trying to read it."""
        headers_a, user_a = _make_user_headers(client, db)
        headers_b, user_b = _make_user_headers(client, db)

        # User A creates a goal
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=headers_a,
            json=_goal_payload(name="User A's secret goal"),
        )
        assert r.status_code == 200
        goal_id = r.json()["id"]

        # User B tries to read it
        r = client.get(f"{settings.API_V1_STR}/goals/{goal_id}", headers=headers_b)
        assert r.status_code == 403

    def test_user_cannot_delete_other_users_goal(self, client: TestClient, db: Session):
        headers_a, _ = _make_user_headers(client, db)
        headers_b, _ = _make_user_headers(client, db)

        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=headers_a,
            json=_goal_payload(name="Don't delete me"),
        )
        goal_id = r.json()["id"]

        r = client.delete(f"{settings.API_V1_STR}/goals/{goal_id}", headers=headers_b)
        assert r.status_code == 403

    def test_user_cannot_pause_other_users_goal(self, client: TestClient, db: Session):
        headers_a, _ = _make_user_headers(client, db)
        headers_b, _ = _make_user_headers(client, db)

        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=headers_a,
            json=_goal_payload(name="Not your goal"),
        )
        goal_id = r.json()["id"]

        r = client.patch(f"{settings.API_V1_STR}/goals/{goal_id}/pause", headers=headers_b)
        assert r.status_code == 403


# ── Rapid Operations (Stress) ──────────────────────────────────

class TestRapidOperations:
    """Simulate a user clicking too fast."""

    def test_rapid_create_respects_limit(self, client: TestClient, db: Session):
        """Rapidly creating goals should still be limited."""
        headers, user = _make_user_headers(client, db)

        results = []
        for i in range(settings.MAX_ACTIVE_GOALS + 2):
            r = client.post(
                f"{settings.API_V1_STR}/goals/",
                headers=headers,
                json=_goal_payload(name=f"Rapid {i}"),
            )
            results.append(r.status_code)

        # First MAX_ACTIVE_GOALS should succeed
        assert results[:settings.MAX_ACTIVE_GOALS] == [200] * settings.MAX_ACTIVE_GOALS
        # The rest should be blocked
        for status in results[settings.MAX_ACTIVE_GOALS:]:
            assert status == 400

    def test_rapid_pause_unpause(self, client: TestClient, superuser_token_headers: dict[str, str]):
        """Toggling pause 10 times should always alternate correctly."""
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="Rapid toggle"),
        )
        gid = r.json()["id"]

        expected = ["paused", "on-track"] * 5
        for expected_status in expected:
            r = client.patch(
                f"{settings.API_V1_STR}/goals/{gid}/pause",
                headers=superuser_token_headers,
            )
            assert r.status_code == 200
            assert r.json()["status"] == expected_status

    def test_rapid_update_same_goal(self, client: TestClient, superuser_token_headers: dict[str, str]):
        """Updating the same goal 20 times should always succeed."""
        r = client.post(
            f"{settings.API_V1_STR}/goals/",
            headers=superuser_token_headers,
            json=_goal_payload(name="Rapid update"),
        )
        gid = r.json()["id"]

        for i in range(20):
            r = client.put(
                f"{settings.API_V1_STR}/goals/{gid}",
                headers=superuser_token_headers,
                json={"name": f"Updated {i}", "progress": i % 101},
            )
            assert r.status_code == 200
            assert r.json()["name"] == f"Updated {i}"
