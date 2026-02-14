"""add score_histories table

Revision ID: n5i6j7k8l9m0
Revises: m4h5i6j7k8l9
Create Date: 2026-02-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.models.types import GUID


# revision identifiers, used by Alembic.
revision: str = 'n5i6j7k8l9m0'
down_revision: Union[str, None] = 'm4h5i6j7k8l9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'score_histories',
        sa.Column('id', GUID, primary_key=True, index=True),
        sa.Column('tank_id', GUID, sa.ForeignKey('tanks.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', GUID, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('recorded_at', sa.Date, nullable=False, index=True),
        sa.Column('overall_score', sa.Integer, nullable=False),
        sa.Column('overall_grade', sa.String, nullable=False),
        sa.Column('parameter_stability_score', sa.Integer, nullable=False, server_default='0'),
        sa.Column('maintenance_score', sa.Integer, nullable=False, server_default='0'),
        sa.Column('livestock_health_score', sa.Integer, nullable=False, server_default='0'),
        sa.Column('equipment_score', sa.Integer, nullable=False, server_default='0'),
        sa.Column('maturity_score', sa.Integer, nullable=False, server_default='0'),
        sa.Column('water_chemistry_score', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint('tank_id', 'recorded_at', name='uq_score_history_tank_day'),
    )


def downgrade() -> None:
    op.drop_table('score_histories')
