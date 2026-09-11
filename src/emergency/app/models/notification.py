"""Notification model."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey

from app.database import Base


def _uuid():
    return uuid.uuid4().hex


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(32), primary_key=True, default=_uuid)
    userId = Column(String(32), ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    body = Column(Text, default="")
    link = Column(String(1000), default="")
    read = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))
