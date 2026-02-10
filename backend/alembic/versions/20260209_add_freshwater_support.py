"""add_freshwater_support

Revision ID: a1b2c3d4e5f6
Revises: bb9fb0a6379d
Create Date: 2026-02-09

Adds water_type and aquarium_subtype to tanks table.
Creates parameter_ranges table for per-tank customizable parameter ranges.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'bb9fb0a6379d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add water_type and aquarium_subtype to tanks
    op.add_column('tanks', sa.Column('water_type', sa.String(), nullable=False, server_default='saltwater'))
    op.add_column('tanks', sa.Column('aquarium_subtype', sa.String(), nullable=True))

    # Create parameter_ranges table
    op.create_table(
        'parameter_ranges',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tank_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parameter_type', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('min_value', sa.Float(), nullable=False),
        sa.Column('max_value', sa.Float(), nullable=False),
        sa.Column('ideal_value', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['tank_id'], ['tanks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tank_id', 'parameter_type', name='uq_tank_parameter_type'),
    )
    op.create_index(op.f('ix_parameter_ranges_tank_id'), 'parameter_ranges', ['tank_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_parameter_ranges_tank_id'), table_name='parameter_ranges')
    op.drop_table('parameter_ranges')
    op.drop_column('tanks', 'aquarium_subtype')
    op.drop_column('tanks', 'water_type')
