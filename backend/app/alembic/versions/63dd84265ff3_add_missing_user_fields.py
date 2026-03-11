"""add missing user fields

Revision ID: 63dd84265ff3
Revises: d7fff4421d11
Create Date: 2026-03-10 00:03:23.570803

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '63dd84265ff3'
down_revision = 'd7fff4421d11'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('user')]

    if 'email_frequency' not in columns:
        op.add_column('user', sa.Column('email_frequency', sa.String(length=32), nullable=False, server_default="daily"))
    
    if 'last_email_sent_at' not in columns:
        op.add_column('user', sa.Column('last_email_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('user')]

    if 'last_email_sent_at' in columns:
        op.drop_column('user', 'last_email_sent_at')
    
    if 'email_frequency' in columns:
        op.drop_column('user', 'email_frequency')
