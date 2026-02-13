"""add disease_records and disease_treatments tables

Revision ID: k2f3g4h5i6j7
Revises: j1e2f3g4h5i6
Create Date: 2026-02-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.models.types import GUID


# revision identifiers, used by Alembic.
revision: str = 'k2f3g4h5i6j7'
down_revision: Union[str, None] = 'j1e2f3g4h5i6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'disease_records',
        sa.Column('id', GUID, primary_key=True, index=True),
        sa.Column('livestock_id', GUID, sa.ForeignKey('livestock.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('tank_id', GUID, sa.ForeignKey('tanks.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', GUID, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('disease_name', sa.String, nullable=False, index=True),
        sa.Column('symptoms', sa.Text, nullable=True),
        sa.Column('diagnosis', sa.Text, nullable=True),
        sa.Column('severity', sa.String, nullable=False, server_default='moderate'),
        sa.Column('status', sa.String, nullable=False, server_default='active'),
        sa.Column('detected_date', sa.Date, nullable=False),
        sa.Column('resolved_date', sa.Date, nullable=True),
        sa.Column('outcome', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        'disease_treatments',
        sa.Column('id', GUID, primary_key=True, index=True),
        sa.Column('disease_record_id', GUID, sa.ForeignKey('disease_records.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', GUID, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('consumable_id', GUID, sa.ForeignKey('consumables.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('treatment_type', sa.String, nullable=False),
        sa.Column('treatment_name', sa.String, nullable=False),
        sa.Column('dosage', sa.String, nullable=True),
        sa.Column('quantity_used', sa.Float, nullable=True),
        sa.Column('quantity_unit', sa.String, nullable=True),
        sa.Column('treatment_date', sa.Date, nullable=False),
        sa.Column('duration_days', sa.Float, nullable=True),
        sa.Column('effectiveness', sa.String, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('disease_treatments')
    op.drop_table('disease_records')
