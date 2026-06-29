"""initial schema

Revision ID: 20260628_0001
Revises:
Create Date: 2026-06-28 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = "20260628_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table(table_name):
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def _index_names(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table(table_name):
        return set()
    return {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if not inspector.has_table("clothes"):
        op.create_table(
            "clothes",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=True),
            sa.Column("category", sa.String(), nullable=True),
            sa.Column("image_path", sa.String(), nullable=True),
            sa.Column("owner_key", sa.String(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    elif "owner_key" not in _column_names("clothes"):
        op.add_column(
            "clothes",
            sa.Column("owner_key", sa.String(), nullable=True, server_default=""),
        )

    clothes_indexes = _index_names("clothes")
    if "ix_clothes_id" not in clothes_indexes:
        op.create_index("ix_clothes_id", "clothes", ["id"], unique=False)
    if "ix_clothes_name" not in clothes_indexes:
        op.create_index("ix_clothes_name", "clothes", ["name"], unique=False)
    if "ix_clothes_owner_key" not in clothes_indexes:
        op.create_index("ix_clothes_owner_key", "clothes", ["owner_key"], unique=False)

    if not inspector.has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("display_name", sa.String(), nullable=True),
            sa.Column("avatar_url", sa.String(), nullable=True),
            sa.Column("face_scan_url", sa.String(), nullable=True),
            sa.Column("gender", sa.String(), nullable=True),
            sa.Column("height", sa.String(), nullable=True),
            sa.Column("weight", sa.String(), nullable=True),
            sa.Column("body_type", sa.String(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    else:
        existing_user_columns = _column_names("users")
        for column_name in [
            "display_name",
            "avatar_url",
            "face_scan_url",
            "gender",
            "height",
            "weight",
            "body_type",
        ]:
            if column_name not in existing_user_columns:
                op.add_column(
                    "users",
                    sa.Column(column_name, sa.String(), nullable=True, server_default=""),
                )

    user_indexes = _index_names("users")
    if "ix_users_id" not in user_indexes:
        op.create_index("ix_users_id", "users", ["id"], unique=False)
    if "ix_users_email" not in user_indexes:
        op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    if inspector.has_table("users"):
        op.drop_index("ix_users_email", table_name="users")
        op.drop_index("ix_users_id", table_name="users")
        op.drop_table("users")

    if inspector.has_table("clothes"):
        op.drop_index("ix_clothes_owner_key", table_name="clothes")
        op.drop_index("ix_clothes_name", table_name="clothes")
        op.drop_index("ix_clothes_id", table_name="clothes")
        op.drop_table("clothes")
