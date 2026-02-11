"""add is_archived to tanks, equipment, consumables, livestock

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
Create Date: 2026-02-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = 'b3c4d5e6f7a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ['tanks', 'equipment', 'consumables', 'livestock']


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column('is_archived', sa.Boolean(), nullable=False, server_default=sa.text('false')))
        op.create_index(op.f(f'ix_{table}_is_archived'), table, ['is_archived'], unique=False)


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(op.f(f'ix_{table}_is_archived'), table_name=table)
        op.drop_column(table, 'is_archived')
