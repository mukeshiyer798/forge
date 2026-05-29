"""Add goal sharing fields (is_public, share_token)

Revision ID: a1b2c3d4e5f7
Revises: 63dd84265ff3
Create Date: 2026-05-20

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f7'
down_revision = '63dd84265ff3'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('goal', sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('goal', sa.Column('share_token', sa.Uuid(), nullable=True))
    op.create_unique_constraint('uq_goal_share_token', 'goal', ['share_token'])


def downgrade():
    op.drop_constraint('uq_goal_share_token', 'goal', type_='unique')
    op.drop_column('goal', 'share_token')
    op.drop_column('goal', 'is_public')
