"""
SM-2 algorithm for spaced repetition.
Calculates next review interval based on performance.
"""

from datetime import datetime, timedelta, timezone


# SM-2 constants
MIN_EASE_FACTOR = 1.3
INITIAL_EASE_FACTOR = 2.5
EASE_BONUS = 0.1
EASE_PENALTY = 0.2
INTERVAL_MODIFIER = 1.3

# Standard SM-2 intervals (in days) for first few reviews
INITIAL_INTERVALS = [1, 3, 7, 14, 30]


def calculate_next_interval(
    *,
    correct: bool,
    current_interval_days: int,
    ease_factor: float,
    consecutive_correct: int,
    review_count: int,
) -> tuple[int, float]:
    """
    Calculate next review interval using SM-2 algorithm.

    Returns:
        Tuple of (next_interval_days, new_ease_factor)
    """
    if not correct:
        # Reset on incorrect - review again in 1 day
        return 1, max(MIN_EASE_FACTOR, ease_factor - EASE_PENALTY)

    new_consecutive = consecutive_correct + 1
    new_review_count = review_count + 1

    # First few reviews use fixed intervals
    if new_review_count <= len(INITIAL_INTERVALS):
        next_interval = INITIAL_INTERVALS[new_review_count - 1]
    else:
        # Subsequent reviews: interval = previous_interval * ease_factor
        next_interval = int(round(current_interval_days * ease_factor))

    # Minimum interval of 1 day
    next_interval = max(1, next_interval)

    # Update ease factor on correct response (SM-2: q=5 gives +0.1)
    new_ease = ease_factor + EASE_BONUS
    new_ease = max(MIN_EASE_FACTOR, min(10.0, new_ease))

    return next_interval, new_ease


def get_next_review_date(
    *,
    correct: bool,
    current_interval_days: int,
    ease_factor: float,
    consecutive_correct: int,
    review_count: int,
    from_date: datetime | None = None,
) -> datetime:
    """
    Get the next review datetime based on SM-2.
    """
    if from_date is None:
        from_date = datetime.now(timezone.utc)

    next_interval, _ = calculate_next_interval(
        correct=correct,
        current_interval_days=current_interval_days,
        ease_factor=ease_factor,
        consecutive_correct=consecutive_correct,
        review_count=review_count,
    )

    return from_date + timedelta(days=next_interval)
