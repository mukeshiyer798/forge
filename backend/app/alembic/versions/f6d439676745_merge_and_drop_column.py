"""merge branches and drop openrouter_api_key

Revision ID: f6d439676745
Revises: e3d2c1b0a9f8, f6d439676744, 43e5d6d65512
Create Date: 2026-02-22 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = 'f6d439676745'
down_revision = ('e3d2c1b0a9f8', 'f6d439676744', '43e5d6d65512')
branch_labels = None
depends_on = None

def upgrade():
    # Drop the duplicate column 'openrouter_api_key' to ensure single source of truth (encrypted_openrouter_key)
    op.drop_column('user', 'openrouter_api_key')

def downgrade():
    # Add back the column if downgraded
    op.add_column('user', sa.Column('openrouter_api_key', sa.String(length=255), nullable=True))
