"""
ICP Test Model

Tracks ICP-OES (Inductively Coupled Plasma - Optical Emission Spectroscopy) test results
for measuring trace elements and water chemistry in reef aquariums.

Supports multiple lab formats:
- ATI Aquaristik
- Triton
- Fauna Marin
- Others

Features:
- Complete trace element analysis
- Quality scores and status tracking
- Lab recommendations and dosing suggestions
- PDF report storage
- Trend analysis over time
"""
from sqlalchemy import Column, String, Text, DateTime, Date, ForeignKey, JSON, Float, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class ICPTest(Base):
    __tablename__ = "icp_tests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(UUID(as_uuid=True), ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Test metadata
    test_date = Column(Date, nullable=False, index=True)
    lab_name = Column(String, nullable=False, index=True)  # ATI, Triton, Fauna Marin, etc.
    test_id = Column(String, nullable=True)  # Lab's test ID/barcode
    sample_date = Column(Date, nullable=True)  # When sample was collected
    received_date = Column(Date, nullable=True)  # When lab received sample
    evaluated_date = Column(Date, nullable=True)  # When lab completed analysis

    # Quality scores (0-100)
    score_major_elements = Column(Integer, nullable=True)
    score_minor_elements = Column(Integer, nullable=True)
    score_pollutants = Column(Integer, nullable=True)
    score_base_elements = Column(Integer, nullable=True)
    score_overall = Column(Integer, nullable=True)

    # Base elements
    salinity = Column(Float, nullable=True)  # PSU
    salinity_status = Column(String, nullable=True)  # NORMAL, ABOVE_NORMAL, etc.
    kh = Column(Float, nullable=True)  # °dKH
    kh_status = Column(String, nullable=True)

    # Major elements (mg/l)
    cl = Column(Float, nullable=True)  # Chloride
    cl_status = Column(String, nullable=True)
    na = Column(Float, nullable=True)  # Sodium
    na_status = Column(String, nullable=True)
    mg = Column(Float, nullable=True)  # Magnesium
    mg_status = Column(String, nullable=True)
    s = Column(Float, nullable=True)  # Sulfur
    s_status = Column(String, nullable=True)
    ca = Column(Float, nullable=True)  # Calcium
    ca_status = Column(String, nullable=True)
    k = Column(Float, nullable=True)  # Potassium
    k_status = Column(String, nullable=True)
    br = Column(Float, nullable=True)  # Bromine
    br_status = Column(String, nullable=True)
    sr = Column(Float, nullable=True)  # Strontium
    sr_status = Column(String, nullable=True)
    b = Column(Float, nullable=True)  # Boron
    b_status = Column(String, nullable=True)
    f = Column(Float, nullable=True)  # Fluorine
    f_status = Column(String, nullable=True)

    # Minor elements (µg/l)
    li = Column(Float, nullable=True)  # Lithium
    li_status = Column(String, nullable=True)
    si = Column(Float, nullable=True)  # Silicon
    si_status = Column(String, nullable=True)
    i = Column(Float, nullable=True)  # Iodine
    i_status = Column(String, nullable=True)
    ba = Column(Float, nullable=True)  # Barium
    ba_status = Column(String, nullable=True)
    mo = Column(Float, nullable=True)  # Molybdenum
    mo_status = Column(String, nullable=True)
    ni = Column(Float, nullable=True)  # Nickel
    ni_status = Column(String, nullable=True)
    mn = Column(Float, nullable=True)  # Manganese
    mn_status = Column(String, nullable=True)
    as_element = Column("as", Float, nullable=True)  # Arsenic (renamed due to keyword)
    as_status = Column(String, nullable=True)
    be = Column(Float, nullable=True)  # Beryllium
    be_status = Column(String, nullable=True)
    cr = Column(Float, nullable=True)  # Chrome
    cr_status = Column(String, nullable=True)
    co = Column(Float, nullable=True)  # Cobalt
    co_status = Column(String, nullable=True)
    fe = Column(Float, nullable=True)  # Iron
    fe_status = Column(String, nullable=True)
    cu = Column(Float, nullable=True)  # Copper
    cu_status = Column(String, nullable=True)
    se = Column(Float, nullable=True)  # Selenium
    se_status = Column(String, nullable=True)
    ag = Column(Float, nullable=True)  # Silver
    ag_status = Column(String, nullable=True)
    v = Column(Float, nullable=True)  # Vanadium
    v_status = Column(String, nullable=True)
    zn = Column(Float, nullable=True)  # Zinc
    zn_status = Column(String, nullable=True)
    sn = Column(Float, nullable=True)  # Tin
    sn_status = Column(String, nullable=True)

    # Nutrients
    no3 = Column(Float, nullable=True)  # Nitrate (mg/l)
    no3_status = Column(String, nullable=True)
    p = Column(Float, nullable=True)  # Phosphorus (µg/l)
    p_status = Column(String, nullable=True)
    po4 = Column(Float, nullable=True)  # Phosphate (mg/l)
    po4_status = Column(String, nullable=True)

    # Pollutants (µg/l)
    al = Column(Float, nullable=True)  # Aluminium
    al_status = Column(String, nullable=True)
    sb = Column(Float, nullable=True)  # Antimony
    sb_status = Column(String, nullable=True)
    bi = Column(Float, nullable=True)  # Bismuth
    bi_status = Column(String, nullable=True)
    pb = Column(Float, nullable=True)  # Lead
    pb_status = Column(String, nullable=True)
    cd = Column(Float, nullable=True)  # Cadmium
    cd_status = Column(String, nullable=True)
    la = Column(Float, nullable=True)  # Lanthanum
    la_status = Column(String, nullable=True)
    tl = Column(Float, nullable=True)  # Thallium
    tl_status = Column(String, nullable=True)
    ti = Column(Float, nullable=True)  # Titanium
    ti_status = Column(String, nullable=True)
    w = Column(Float, nullable=True)  # Tungsten
    w_status = Column(String, nullable=True)
    hg = Column(Float, nullable=True)  # Mercury
    hg_status = Column(String, nullable=True)

    # Lab recommendations and dosing
    recommendations = Column(JSON, nullable=True)  # List of recommendation objects
    dosing_instructions = Column(JSON, nullable=True)  # Dosing recommendations from lab

    # PDF storage
    pdf_filename = Column(String, nullable=True)
    pdf_path = Column(String, nullable=True)

    # Additional notes
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tank = relationship("Tank", back_populates="icp_tests")
    owner = relationship("User", back_populates="icp_tests")

    def __repr__(self):
        return f"<ICPTest {self.lab_name} - {self.test_date} (Overall: {self.score_overall or 'N/A'}/100)>"
