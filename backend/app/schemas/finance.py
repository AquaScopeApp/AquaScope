"""Finance Schemas - Aggregation Response Types"""
from pydantic import BaseModel
from uuid import UUID
from typing import Optional, List


class CategorySpending(BaseModel):
    category: str
    total: float
    count: int


class TankSpending(BaseModel):
    tank_id: UUID
    tank_name: str
    total: float
    equipment: float
    consumables: float
    livestock: float
    icp_tests: float


class MonthlySpending(BaseModel):
    year: int
    month: int
    label: str
    total: float
    equipment: float
    consumables: float
    livestock: float
    icp_tests: float
    cumulative: float


class FinanceSummary(BaseModel):
    total_spent: float
    total_equipment: float
    total_consumables: float
    total_livestock: float
    total_icp_tests: float
    by_category: List[CategorySpending]
    by_tank: List[TankSpending]
    monthly: List[MonthlySpending]


class ExpenseDetail(BaseModel):
    id: UUID
    name: str
    category: str
    tank_id: UUID
    tank_name: str
    date: Optional[str] = None
    price: Optional[float] = None
    price_raw: Optional[str] = None
    purchase_url: Optional[str] = None


class ExpenseDetailList(BaseModel):
    items: List[ExpenseDetail]
    total: int
    page: int
    page_size: int
    total_pages: int
