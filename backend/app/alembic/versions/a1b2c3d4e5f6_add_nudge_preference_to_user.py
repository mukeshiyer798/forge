"""Add nudge_preference to user

Revision ID: a1b2c3d4e5f6
Revises: 1a31ce608336
Create Date: 2025-02-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "1a31ce608336"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user", sa.Column("nudge_preference", sa.String(length=32), nullable=False, server_default="daily"))


def downgrade():
    op.drop_column("user", "nudge_preference")
