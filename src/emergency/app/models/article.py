"""Article model."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime

from app.database import Base


def _uuid():
    return uuid.uuid4().hex


class Article(Base):
    __tablename__ = "articles"

    id = Column(String(32), primary_key=True, default=_uuid)
    title = Column(String(500), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    excerpt = Column(Text, default="")
    content = Column(Text, default="")
    category = Column(String(255), default="")
    authorId = Column(String(32), default=None)
    authorName = Column(String(255), default="")
    coverImage = Column(String(1000), default="")
    featuredImage = Column(String(1000), default="")
    featured = Column(Boolean, default=False)
    published = Column(Boolean, default=False)
    readTime = Column(String(50), default="")
    accent = Column(String(20), default="#14b8a6")
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
