"""add icp tests table

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-02-08 01:35:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'k2l3m4n5o6p7'
down_revision = 'j1k2l3m4n5o6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create icp_tests table
    op.create_table(
        'icp_tests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tank_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        
        # Test metadata
        sa.Column('test_date', sa.Date(), nullable=False),
        sa.Column('lab_name', sa.String(), nullable=False),
        sa.Column('test_id', sa.String(), nullable=True),
        sa.Column('sample_date', sa.Date(), nullable=True),
        sa.Column('received_date', sa.Date(), nullable=True),
        sa.Column('evaluated_date', sa.Date(), nullable=True),
        
        # Quality scores
        sa.Column('score_major_elements', sa.Integer(), nullable=True),
        sa.Column('score_minor_elements', sa.Integer(), nullable=True),
        sa.Column('score_pollutants', sa.Integer(), nullable=True),
        sa.Column('score_base_elements', sa.Integer(), nullable=True),
        sa.Column('score_overall', sa.Integer(), nullable=True),
        
        # Base elements
        sa.Column('salinity', sa.Float(), nullable=True),
        sa.Column('salinity_status', sa.String(), nullable=True),
        sa.Column('kh', sa.Float(), nullable=True),
        sa.Column('kh_status', sa.String(), nullable=True),
        
        # All element columns - will be created programmatically below
        # Major elements (mg/l): cl, na, mg, s, ca, k, br, sr, b, f
        # Minor elements (µg/l): li, si, i, ba, mo, ni, mn, as, be, cr, co, fe, cu, se, ag, v, zn, sn
        # Nutrients: no3, p, po4
        # Pollutants: al, sb, bi, pb, cd, la, tl, ti, w, hg
        
        # Recommendations and files
        sa.Column('recommendations', postgresql.JSON(), nullable=True),
        sa.Column('dosing_instructions', postgresql.JSON(), nullable=True),
        sa.Column('pdf_filename', sa.String(), nullable=True),
        sa.Column('pdf_path', sa.String(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        
        # Foreign keys
        sa.ForeignKeyConstraint(['tank_id'], ['tanks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Add all element columns (value + status)
    elements = [
        # Major elements (mg/l)
        'cl', 'na', 'mg', 's', 'ca', 'k', 'br', 'sr', 'b', 'f',
        # Minor elements (µg/l)
        'li', 'si', 'i', 'ba', 'mo', 'ni', 'mn', 'as', 'be', 'cr', 'co', 'fe', 'cu', 'se', 'ag', 'v', 'zn', 'sn',
        # Nutrients
        'no3', 'p', 'po4',
        # Pollutants
        'al', 'sb', 'bi', 'pb', 'cd', 'la', 'tl', 'ti', 'w', 'hg'
    ]
    
    for elem in elements:
        op.add_column('icp_tests', sa.Column(elem, sa.Float(), nullable=True))
        op.add_column('icp_tests', sa.Column(f'{elem}_status', sa.String(), nullable=True))
    
    # Create indexes
    op.create_index('ix_icp_tests_id', 'icp_tests', ['id'])
    op.create_index('ix_icp_tests_tank_id', 'icp_tests', ['tank_id'])
    op.create_index('ix_icp_tests_user_id', 'icp_tests', ['user_id'])
    op.create_index('ix_icp_tests_test_date', 'icp_tests', ['test_date'])
    op.create_index('ix_icp_tests_lab_name', 'icp_tests', ['lab_name'])


def downgrade() -> None:
    op.drop_table('icp_tests')
