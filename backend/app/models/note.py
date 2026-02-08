"""
Note Model

Stores user observations, events, and general notes about their reef tank.

Design Decisions:
- Text content: Flexible for any observation (coral fragging, fish behavior, equipment changes)
- Tank association: Notes are specific to a tank
- Timestamps: Track when observations were made and modified

Use Cases:
- Document coral growth observations
- Record equipment changes (new pump, light schedule)
- Track fish behavior or health issues
- Note water chemistry anomalies
- Log feeding changes or experiments
"""
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.models.types import GUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Note(Base):
    __tablename__ = "notes"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)  # Index for sorting
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    tank = relationship("Tank", back_populates="notes")
    owner = relationship("User", back_populates="notes")

    def __repr__(self):
        return f"<Note {self.id} - {self.content[:30]}...>"
