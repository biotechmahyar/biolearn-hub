"""User model — auth + roles."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid():
    return uuid.uuid4().hex


class User(Base):
    __tablename__ = "users"

    id = Column(String(32), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, default="")
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="student")  # student / instructor / admin / superadmin
    phone = Column(String(30), default=None)
    avatar = Column(String(500), default=None)
    bio = Column(Text, default="")
    published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    enrollments = relationship("Enrollment", back_populates="user")
    lesson_progress = relationship("LessonProgress", back_populates="user")
    orders = relationship("Order", back_populates="user")
