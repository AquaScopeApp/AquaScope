"""Report Card Schemas"""
from pydantic import BaseModel
from typing import List, Optional


class CategoryScore(BaseModel):
    score: int
    grade: str
    weight: int


class Achievement(BaseModel):
    key: str
    icon: str
    label: str
    detail: str


class Insight(BaseModel):
    type: str  # "success", "info", "warning", "alert"
    message: str


class ReportCardStats(BaseModel):
    total_livestock: int = 0
    species_count: int = 0
    type_diversity: int = 0
    active_diseases: int = 0
    overdue_maintenance: int = 0
    total_reminders: int = 0
    equipment_count: int = 0
    failing_equipment: int = 0


class ReportCardResponse(BaseModel):
    overall_score: int
    overall_grade: str
    status: str
    categories: dict  # {category_name: CategoryScore}
    stats: ReportCardStats
    achievements: List[Achievement] = []
    insights: List[Insight] = []
