"""Add productivity features: pomodoro, spaced repetition, user preferences

Revision ID: c2d3e4f5a6b7
Revises: b7f8e9d0c1a2
Create Date: 2026-02-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c2d3e4f5a6b7"
down_revision = "b7f8e9d0c1a2"
branch_labels = None
depends_on = None


def upgrade():
    # Add user preference columns
    op.add_column(
        "user",
        sa.Column("email_daily_plan_enabled", sa.Boolean(), nullable=False, server_default="true"),
    )
    op.add_column(
        "user",
        sa.Column("email_morning_time", sa.String(length=5), nullable=False, server_default="07:00"),
    )
    op.add_column(
        "user",
        sa.Column("email_afternoon_time", sa.String(length=5), nullable=False, server_default="14:00"),
    )
    op.add_column(
        "user",
        sa.Column("email_evening_time", sa.String(length=5), nullable=False, server_default="20:00"),
    )
    op.add_column(
        "user",
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
    )
    op.add_column(
        "user",
        sa.Column("theme_preference", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "user",
        sa.Column("greeting_preference", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "user",
        sa.Column("status_message", sa.String(length=255), nullable=True),
    )

    # Create pomodoro_session table
    op.create_table(
        "pomodorosession",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("goal_id", sa.Uuid(), nullable=True),
        sa.Column("topic_id", sa.String(length=100), nullable=True),
        sa.Column("duration", sa.Integer(), nullable=False, server_default="25"),
        sa.Column("session_type", sa.String(length=20), nullable=False, server_default="focus"),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_pomodorosession_owner_id"), "pomodorosession", ["owner_id"], unique=False
    )

    # Create spacedrepetitionitem table
    op.create_table(
        "spacedrepetitionitem",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("goal_id", sa.Uuid(), nullable=False),
        sa.Column("topic_id", sa.String(length=100), nullable=False),
        sa.Column("topic_name", sa.String(length=255), nullable=False),
        sa.Column("active_recall_question", sa.String(length=1000), nullable=True),
        sa.Column("resources", sa.String(), nullable=True),
        sa.Column("ease_factor", sa.Float(), nullable=False, server_default="2.5"),
        sa.Column("interval_days", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("review_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("consecutive_correct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_review_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_spacedrepetitionitem_owner_id"),
        "spacedrepetitionitem",
        ["owner_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_spacedrepetitionitem_next_review_at"),
        "spacedrepetitionitem",
        ["next_review_at"],
        unique=False,
    )


def downgrade():
    op.drop_index(op.f("ix_spacedrepetitionitem_next_review_at"), table_name="spacedrepetitionitem")
    op.drop_index(op.f("ix_spacedrepetitionitem_owner_id"), table_name="spacedrepetitionitem")
    op.drop_table("spacedrepetitionitem")
    op.drop_index(op.f("ix_pomodorosession_owner_id"), table_name="pomodorosession")
    op.drop_table("pomodorosession")

    op.drop_column("user", "status_message")
    op.drop_column("user", "greeting_preference")
    op.drop_column("user", "theme_preference")
    op.drop_column("user", "timezone")
    op.drop_column("user", "email_evening_time")
    op.drop_column("user", "email_afternoon_time")
    op.drop_column("user", "email_morning_time")
    op.drop_column("user", "email_daily_plan_enabled")
