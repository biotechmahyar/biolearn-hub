"""Course + sections + lessons + categories."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


def _uuid():
    return uuid.uuid4().hex


class Category(Base):
    __tablename__ = "categories"

    id = Column(String(32), primary_key=True, default=_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, default="")
    icon = Column(String(255), default="")
    accent = Column(String(20), default="#0ea5e9")
    order = Column(Integer, default=0)
    published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Course(Base):
    __tablename__ = "courses"

    id = Column(String(32), primary_key=True, default=_uuid)
    title = Column(String(500), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    description = Column(Text, default="")
    categoryId = Column(String(32), ForeignKey("categories.id"), nullable=True)
    instructorId = Column(String(32), ForeignKey("users.id"), nullable=True)
    price = Column(Integer, default=0)
    discountPrice = Column(Integer, default=None)
    coverImage = Column(String(1000), default="")
    status = Column(String(20), default="draft")
    published = Column(Boolean, default=False)
    featured = Column(Boolean, default=False)
    free = Column(Boolean, default=False)
    duration = Column(String(50), default="")
    durationText = Column(String(100), default="")
    level = Column(String(50), default="")
    mode = Column(String(50), default="")
    summary = Column(Text, default="")
    includes = Column(Text, default="")
    lessonsCount = Column(Integer, default=0)
    studentsCount = Column(Integer, default=0)
    rating = Column(Float, default=0)
    ratingCount = Column(Integer, default=0)
    accent = Column(String(20), default="#14b8a6")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    category = relationship("Category", foreign_keys=[categoryId])
    instructor = relationship("User", foreign_keys=[instructorId])
    sections = relationship("CourseSection", back_populates="course", order_by="CourseSection.order")
    enrollments = relationship("Enrollment", back_populates="course")


class CourseSection(Base):
    __tablename__ = "course_sections"

    id = Column(String(32), primary_key=True, default=_uuid)
    courseId = Column(String(32), ForeignKey("courses.id"), nullable=False)
    title = Column(String(500), nullable=False)
    order = Column(Integer, default=0)

    course = relationship("Course", back_populates="sections")
    lessons = relationship("CourseLesson", back_populates="section", order_by="CourseLesson.order")


class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id = Column(String(32), primary_key=True, default=_uuid)
    sectionId = Column(String(32), ForeignKey("course_sections.id"), nullable=False)
    title = Column(String(500), nullable=False)
    durationMin = Column(Integer, default=0)
    order = Column(Integer, default=0)
    videoUrl = Column(String(1000), default="")
    content = Column(Text, default="")

    section = relationship("CourseSection", back_populates="lessons")
