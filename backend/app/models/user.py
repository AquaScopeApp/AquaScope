"""
User Model

Represents authenticated users in the system. This is the core entity for multi-tenancy,
ensuring each user has isolated access to their own reef data.

Design Decisions:
- UUID primary key: Provides better security and prevents enumeration attacks
- Email as unique identifier: Standard practice for authentication
- Hashed password: Never store plain text passwords
- Timestamps: Track account creation and updates for auditing
"""
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base
from app.models.types import GUID


class User(Base):
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    default_tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="SET NULL", use_alter=True), nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships - SQLAlchemy will handle cascade deletes
    tanks = relationship("Tank", back_populates="owner", cascade="all, delete-orphan", foreign_keys="Tank.user_id")
    notes = relationship("Note", back_populates="owner", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="owner", cascade="all, delete-orphan")
    maintenance_reminders = relationship("MaintenanceReminder", back_populates="owner", cascade="all, delete-orphan")
    livestock = relationship("Livestock", back_populates="owner", cascade="all, delete-orphan")
    equipment = relationship("Equipment", back_populates="owner", cascade="all, delete-orphan")
    icp_tests = relationship("ICPTest", back_populates="owner", cascade="all, delete-orphan")
    consumables = relationship("Consumable", back_populates="owner", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"
