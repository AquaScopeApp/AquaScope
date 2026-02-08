"""ICP Test Schemas"""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date
from typing import Optional, Dict, Any, List


class ICPTestBase(BaseModel):
    """Base ICP test schema with all measurable fields"""
    # Test metadata
    test_date: date
    lab_name: str = Field(..., min_length=1, max_length=100)
    test_id: Optional[str] = Field(None, max_length=200)
    sample_date: Optional[date] = None
    received_date: Optional[date] = None
    evaluated_date: Optional[date] = None

    # Quality scores
    score_major_elements: Optional[int] = Field(None, ge=0, le=100)
    score_minor_elements: Optional[int] = Field(None, ge=0, le=100)
    score_pollutants: Optional[int] = Field(None, ge=0, le=100)
    score_base_elements: Optional[int] = Field(None, ge=0, le=100)
    score_overall: Optional[int] = Field(None, ge=0, le=100)

    # Base elements
    salinity: Optional[float] = None
    salinity_status: Optional[str] = None
    kh: Optional[float] = None
    kh_status: Optional[str] = None

    # Major elements (mg/l)
    cl: Optional[float] = None
    cl_status: Optional[str] = None
    na: Optional[float] = None
    na_status: Optional[str] = None
    mg: Optional[float] = None
    mg_status: Optional[str] = None
    s: Optional[float] = None
    s_status: Optional[str] = None
    ca: Optional[float] = None
    ca_status: Optional[str] = None
    k: Optional[float] = None
    k_status: Optional[str] = None
    br: Optional[float] = None
    br_status: Optional[str] = None
    sr: Optional[float] = None
    sr_status: Optional[str] = None
    b: Optional[float] = None
    b_status: Optional[str] = None
    f: Optional[float] = None
    f_status: Optional[str] = None

    # Minor elements (µg/l)
    li: Optional[float] = None
    li_status: Optional[str] = None
    si: Optional[float] = None
    si_status: Optional[str] = None
    i: Optional[float] = None
    i_status: Optional[str] = None
    ba: Optional[float] = None
    ba_status: Optional[str] = None
    mo: Optional[float] = None
    mo_status: Optional[str] = None
    ni: Optional[float] = None
    ni_status: Optional[str] = None
    mn: Optional[float] = None
    mn_status: Optional[str] = None
    as_element: Optional[float] = Field(None, alias="as")
    as_status: Optional[str] = None
    be: Optional[float] = None
    be_status: Optional[str] = None
    cr: Optional[float] = None
    cr_status: Optional[str] = None
    co: Optional[float] = None
    co_status: Optional[str] = None
    fe: Optional[float] = None
    fe_status: Optional[str] = None
    cu: Optional[float] = None
    cu_status: Optional[str] = None
    se: Optional[float] = None
    se_status: Optional[str] = None
    ag: Optional[float] = None
    ag_status: Optional[str] = None
    v: Optional[float] = None
    v_status: Optional[str] = None
    zn: Optional[float] = None
    zn_status: Optional[str] = None
    sn: Optional[float] = None
    sn_status: Optional[str] = None

    # Nutrients
    no3: Optional[float] = None
    no3_status: Optional[str] = None
    p: Optional[float] = None
    p_status: Optional[str] = None
    po4: Optional[float] = None
    po4_status: Optional[str] = None

    # Pollutants (µg/l)
    al: Optional[float] = None
    al_status: Optional[str] = None
    sb: Optional[float] = None
    sb_status: Optional[str] = None
    bi: Optional[float] = None
    bi_status: Optional[str] = None
    pb: Optional[float] = None
    pb_status: Optional[str] = None
    cd: Optional[float] = None
    cd_status: Optional[str] = None
    la: Optional[float] = None
    la_status: Optional[str] = None
    tl: Optional[float] = None
    tl_status: Optional[str] = None
    ti: Optional[float] = None
    ti_status: Optional[str] = None
    w: Optional[float] = None
    w_status: Optional[str] = None
    hg: Optional[float] = None
    hg_status: Optional[str] = None

    # Recommendations and files
    recommendations: Optional[List[Dict[str, Any]]] = None
    dosing_instructions: Optional[Dict[str, Any]] = None
    pdf_filename: Optional[str] = None
    pdf_path: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        populate_by_name = True  # Allow both 'as_element' and 'as'


class ICPTestCreate(ICPTestBase):
    """Schema for creating ICP test"""
    tank_id: UUID


class ICPTestUpdate(BaseModel):
    """Schema for updating ICP test - all fields optional"""
    test_date: Optional[date] = None
    lab_name: Optional[str] = Field(None, min_length=1, max_length=100)
    test_id: Optional[str] = Field(None, max_length=200)
    sample_date: Optional[date] = None
    received_date: Optional[date] = None
    evaluated_date: Optional[date] = None
    notes: Optional[str] = None
    # Add other fields as needed for updates


class ICPTestResponse(ICPTestBase):
    """Schema for ICP test responses"""
    id: UUID
    tank_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class ICPTestSummary(BaseModel):
    """Compact summary for list views"""
    id: UUID
    tank_id: UUID
    test_date: date
    lab_name: str
    score_overall: Optional[int]
    score_major_elements: Optional[int]
    score_minor_elements: Optional[int]
    score_pollutants: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True
