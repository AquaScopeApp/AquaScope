"""
Score History Model

Tracks daily snapshots of tank report card scores over time.
One record per tank per day (upserted on each report card computation).
"""
from sqlalchemy import Column, String, Integer, Date, DateTime, ForeignKey, UniqueConstraint
from app.models.types import GUID
from sqlalchemy.orm import relationship
from datetime import datetime, date
import uuid

from app.database import Base


class ScoreHistory(Base):
    __tablename__ = "score_histories"
    __table_args__ = (
        UniqueConstraint("tank_id", "recorded_at", name="uq_score_history_tank_day"),
    )

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    recorded_at = Column(Date, nullable=False, default=date.today, index=True)

    # Overall
    overall_score = Column(Integer, nullable=False)
    overall_grade = Column(String, nullable=False)

    # Category scores (0-100)
    parameter_stability_score = Column(Integer, nullable=False, default=0)
    maintenance_score = Column(Integer, nullable=False, default=0)
    livestock_health_score = Column(Integer, nullable=False, default=0)
    equipment_score = Column(Integer, nullable=False, default=0)
    maturity_score = Column(Integer, nullable=False, default=0)
    water_chemistry_score = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tank = relationship("Tank", back_populates="score_histories")
    owner = relationship("User")

    def __repr__(self):
        return f"<ScoreHistory tank={self.tank_id} date={self.recorded_at} score={self.overall_score}>"
