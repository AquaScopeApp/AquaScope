"""
Photo Model

Manages uploaded aquarium photos with metadata.

Design Decisions:
- Store file paths, not binary data: More efficient for serving images
- Separate thumbnail path: For gallery views without loading full-size images
- taken_at vs created_at: Photo might be uploaded later than when it was taken
- Filename stored: Allows for file integrity checks and direct access

Storage Strategy:
- Files stored on disk (or future: S3, cloud storage)
- Database stores metadata and file references
- Thumbnails generated on upload for performance

Why not store images in database?
- PostgreSQL can store binary data (bytea), but it's inefficient
- File system is optimized for large binary files
- Easier to serve with nginx/CDN
- Simpler backup and migration strategies
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from app.models.types import GUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id = Column(GUID, primary_key=True, default=uuid.uuid4, index=True)
    tank_id = Column(GUID, ForeignKey("tanks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    taken_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)  # Index for chronological sorting
    is_tank_display = Column(Boolean, default=False, nullable=False)  # Pinned as tank display photo
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    tank = relationship("Tank", back_populates="photos")
    owner = relationship("User", back_populates="photos")

    def __repr__(self):
        return f"<Photo {self.filename}>"
