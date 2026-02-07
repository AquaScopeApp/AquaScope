"""add tank volume split description image and events

Revision ID: 8d573ff0f26a
Revises: 
Create Date: 2026-02-07 20:23:03.752273

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d573ff0f26a'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to tanks table
    op.add_column('tanks', sa.Column('display_volume_liters', sa.Float(), nullable=True))
    op.add_column('tanks', sa.Column('sump_volume_liters', sa.Float(), nullable=True))
    op.add_column('tanks', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('tanks', sa.Column('image_url', sa.String(), nullable=True))

    # Migrate existing volume_liters data to display_volume_liters
    op.execute("""
        UPDATE tanks
        SET display_volume_liters = volume_liters
        WHERE volume_liters IS NOT NULL
    """)

    # Drop old volume_liters column
    op.drop_column('tanks', 'volume_liters')

    # Create tank_events table
    op.create_table(
        'tank_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tank_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('event_date', sa.Date(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tank_id'], ['tanks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index(op.f('ix_tank_events_id'), 'tank_events', ['id'], unique=False)
    op.create_index(op.f('ix_tank_events_tank_id'), 'tank_events', ['tank_id'], unique=False)


def downgrade() -> None:
    # Drop tank_events table
    op.drop_index(op.f('ix_tank_events_tank_id'), table_name='tank_events')
    op.drop_index(op.f('ix_tank_events_id'), table_name='tank_events')
    op.drop_table('tank_events')

    # Add back volume_liters column
    op.add_column('tanks', sa.Column('volume_liters', sa.Float(), nullable=True))

    # Migrate display_volume_liters back to volume_liters
    op.execute("""
        UPDATE tanks
        SET volume_liters = display_volume_liters
        WHERE display_volume_liters IS NOT NULL
    """)

    # Drop new columns
    op.drop_column('tanks', 'image_url')
    op.drop_column('tanks', 'description')
    op.drop_column('tanks', 'sump_volume_liters')
    op.drop_column('tanks', 'display_volume_liters')
