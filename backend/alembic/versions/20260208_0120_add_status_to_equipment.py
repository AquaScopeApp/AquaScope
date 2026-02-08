"""add status to equipment

Revision ID: j1k2l3m4n5o6
Revises: e5f6g7h8i9j0
Create Date: 2026-02-08 01:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'j1k2l3m4n5o6'
down_revision = 'e5f6g7h8i9j0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add status column with default value 'active'
    op.add_column('equipment', sa.Column('status', sa.String(), nullable=False, server_default='active'))

    # Create index on status column for better query performance
    op.create_index(op.f('ix_equipment_status'), 'equipment', ['status'], unique=False)


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_equipment_status'), table_name='equipment')

    # Drop column
    op.drop_column('equipment', 'status')
