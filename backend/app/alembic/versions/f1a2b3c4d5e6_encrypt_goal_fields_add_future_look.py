"""Encrypt goal roadmap fields and add future_look column

Revision ID: f1a2b3c4d5e6
Revises: c2d3e4f5a6b7
Create Date: 2026-02-21

"""
import logging
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

logger = logging.getLogger(__name__)

# revision identifiers, used by Alembic.
revision = "f1a2b3c4d5e6"
down_revision = "43e5d6d65512"
branch_labels = None
depends_on = None


def _get_fernet():
    """Import the same Fernet instance used by the app's EncryptedString."""
    from app.core.security import _fernet
    return _fernet


def upgrade():
    # 1. Add the new future_look column
    op.add_column(
        "goal",
        sa.Column("future_look", sa.String(), nullable=True),
    )

    # 2. Re-encrypt existing plaintext data in roadmap columns.
    #    The app's EncryptedString.process_result_value has a fallback that
    #    returns raw text if decryption fails, so old rows won't crash the app.
    #    But we still want them encrypted at rest.
    conn = op.get_bind()
    fernet = _get_fernet()

    columns_to_encrypt = ["subtopics", "resources", "topics", "capstone"]

    rows = conn.execute(text("SELECT id, subtopics, resources, topics, capstone FROM goal"))
    for row in rows:
        row_id = row[0]
        updates = {}
        for i, col_name in enumerate(columns_to_encrypt):
            value = row[i + 1]
            if value is None:
                continue
            # Try to decrypt — if it fails, the value is plaintext and needs encrypting
            try:
                fernet.decrypt(value.encode("utf-8"))
                # Already encrypted, skip
            except Exception:
                encrypted = fernet.encrypt(value.encode("utf-8")).decode("utf-8")
                updates[col_name] = encrypted

        if updates:
            set_clause = ", ".join(f"{k} = :val_{k}" for k in updates)
            params = {f"val_{k}": v for k, v in updates.items()}
            params["row_id"] = str(row_id)
            conn.execute(
                text(f"UPDATE goal SET {set_clause} WHERE id = :row_id"),
                params,
            )
            logger.info(f"Migration: encrypted {len(updates)} column(s) for goal {row_id}")

    logger.info("Migration f1a2b3c4d5e6 complete: goal fields encrypted, future_look added.")


def downgrade():
    # Decrypt columns back to plaintext
    conn = op.get_bind()
    fernet = _get_fernet()

    columns_to_decrypt = ["subtopics", "resources", "topics", "capstone"]

    rows = conn.execute(text("SELECT id, subtopics, resources, topics, capstone FROM goal"))
    for row in rows:
        row_id = row[0]
        updates = {}
        for i, col_name in enumerate(columns_to_decrypt):
            value = row[i + 1]
            if value is None:
                continue
            try:
                decrypted = fernet.decrypt(value.encode("utf-8")).decode("utf-8")
                updates[col_name] = decrypted
            except Exception:
                pass  # Already plaintext

        if updates:
            set_clause = ", ".join(f"{k} = :val_{k}" for k in updates)
            params = {f"val_{k}": v for k, v in updates.items()}
            params["row_id"] = str(row_id)
            conn.execute(
                text(f"UPDATE goal SET {set_clause} WHERE id = :row_id"),
                params,
            )

    op.drop_column("goal", "future_look")
