"""Enrollment + lesson progress."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid():
    return uuid.uuid4().hex


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(String(32), primary_key=True, default=_uuid)
    userId = Column(String(32), ForeignKey("users.id"), nullable=False)
    courseId = Column(String(32), ForeignKey("courses.id"), nullable=False)
    enrolledAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completedLessons = Column(Text, default="[]")  # JSON array of lesson IDs
    lastActiveAt = Column(DateTime, default=None)
    lastLessonId = Column(String(255), default=None)

    user = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(String(32), primary_key=True, default=_uuid)
    userId = Column(String(32), ForeignKey("users.id"), nullable=False)
    courseId = Column(String(32), ForeignKey("courses.id"), nullable=False)
    lessonId = Column(String(255), nullable=False)
    completed = Column(Boolean, default=False)
    completedAt = Column(DateTime, default=None)

    user = relationship("User", back_populates="lesson_progress")
