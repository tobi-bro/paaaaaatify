"""initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-11-08 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=True),
        sa.Column('username', sa.String(length=100), nullable=False, unique=True, index=True),
        sa.Column('display_name', sa.String(length=150), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('bio', sa.String(length=500), nullable=True),
        sa.Column('is_verified', sa.Boolean(), default=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_admin', sa.Boolean(), default=False),
        sa.Column('google_id', sa.String(length=255), nullable=True, unique=True, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True)
    )

    # User Settings
    op.create_table(
        'user_settings',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('notifications', sa.Boolean(), default=True),
        sa.Column('audio_quality', sa.String(length=50), default='high'),
        sa.Column('dark_mode', sa.Boolean(), default=True),
        sa.Column('data_saver', sa.Boolean(), default=False),
        sa.Column('offline_sync', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True)
    )

    # Revoked Tokens
    op.create_table(
        'revoked_tokens',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('token', sa.String(length=500), nullable=False, unique=True, index=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True)
    )

def downgrade() -> None:
    op.drop_table('revoked_tokens')
    op.drop_table('user_settings')
    op.drop_table('users')

