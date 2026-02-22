"""Create goal table

Revision ID: e3d2c1b0a9f8
Revises: d98dd8ec85a3
Create Date: 2026-02-22

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes

# revision identifiers, used by Alembic.
revision = 'e3d2c1b0a9f8'
down_revision = 'd98dd8ec85a3'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('goal',
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
    sa.Column('type', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('description', sqlmodel.sql.sqltypes.AutoString(length=1000), nullable=True),
    sa.Column('target_date', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
    sa.Column('status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False, server_default='on-track'),
    sa.Column('priority', sa.Integer(), nullable=True),
    sa.Column('daily_task_requirement', sa.Integer(), nullable=True),
    sa.Column('progress', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('subtopics', sa.Text(), nullable=True),
    sa.Column('resources', sa.Text(), nullable=True),
    sa.Column('topics', sa.Text(), nullable=True),
    sa.Column('capstone', sa.Text(), nullable=True),
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('owner_id', sa.Uuid(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('last_logged_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['owner_id'], ['user.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('goal')
