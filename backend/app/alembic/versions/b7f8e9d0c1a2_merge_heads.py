"""Merge multiple heads (nudge_preference and created_at)

Revision ID: b7f8e9d0c1a2
Revises: a1b2c3d4e5f6, fe56fa70289e
Create Date: 2026-02-19

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "b7f8e9d0c1a2"
down_revision = ("a1b2c3d4e5f6", "fe56fa70289e")
branch_labels = None
depends_on = None


def upgrade():
    # Merge migration: no schema changes, both branches already applied
    pass


def downgrade():
    # Merge migration: no schema changes
    pass
