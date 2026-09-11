"""Workshop model."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime

from app.database import Base


def _uuid():
    return uuid.uuid4().hex


class Workshop(Base):
    __tablename__ = "workshops"

    id = Column(String(32), primary_key=True, default=_uuid)
    title = Column(String(500), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, default="")
    summary = Column(Text, default="")
    instructorId = Column(String(32), default=None)
    price = Column(Integer, default=0)
    free = Column(Boolean, default=False)
    published = Column(Boolean, default=False)
    time = Column(String(255), default="")
    location = Column(String(500), default="")
    topic = Column(String(255), default="")
    capacity = Column(Integer, default=0)
    registeredCount = Column(Integer, default=0)
    coverImage = Column(String(1000), default="")
    expertTalk = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
