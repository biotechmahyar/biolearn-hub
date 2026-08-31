"""
Database models for the Iran Mirror Site.
Mirrors the public-facing Convex tables.
"""

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Boolean,
    Float,
    JSON,
    DateTime,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./iran_mirror.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Categories ──────────────────────────────────────────────────────────────
class Category(Base):
    __tablename__ = "categories"
    id = Column(String, primary_key=True)  # Convex _id
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(Text, default="")
    icon = Column(String, default="Dna")
    accent = Column(String, default="teal")
    order = Column(Integer, default=0)
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Instructors ─────────────────────────────────────────────────────────────
class Instructor(Base):
    __tablename__ = "instructors"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    title = Column(String, default="")
    bio = Column(Text, default="")
    education = Column(JSON, default=list)
    specialties = Column(JSON, default=list)
    accent = Column(String, default="teal")
    verified = Column(Boolean, default=False)
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Courses ─────────────────────────────────────────────────────────────────
class Course(Base):
    __tablename__ = "courses"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    category_id = Column(String, nullable=False)
    instructor_id = Column(String, nullable=False)
    summary = Column(Text, default="")
    description = Column(Text, default="")
    audience = Column(JSON, default=list)
    prerequisites = Column(JSON, default=list)
    syllabus = Column(JSON, default=list)
    duration_text = Column(String, default="")
    mode = Column(String, default="recorded")
    price = Column(Integer, default=0)
    discount_price = Column(Integer, nullable=True)
    rating = Column(Float, default=0)
    rating_count = Column(Integer, default=0)
    students_count = Column(Integer, default=0)
    accent = Column(String, default="teal")
    bundle = Column(String, default="basic")
    includes = Column(JSON, default=list)
    has_sample_video = Column(Boolean, default=False)
    files = Column(JSON, default=list)
    published = Column(Boolean, default=False)
    featured = Column(Boolean, default=False)
    popular = Column(Boolean, default=False)
    created_at = Column(Integer, default=0)
    # Denormalized relations
    category_name = Column(String, default="")
    category_slug = Column(String, default="")
    instructor_name = Column(String, default="")
    instructor_slug = Column(String, default="")
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Products ────────────────────────────────────────────────────────────────
class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    type = Column(String, default="flashcards")
    description = Column(Text, default="")
    price = Column(Integer, default=0)
    accent = Column(String, default="teal")
    published = Column(Boolean, default=False)
    featured = Column(Boolean, default=False)
    created_at = Column(Integer, default=0)
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Workshops ───────────────────────────────────────────────────────────────
class Workshop(Base):
    __tablename__ = "workshops"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    instructor_id = Column(String, nullable=False)
    topic = Column(String, default="")
    date = Column(String, default="")
    time = Column(String, default="")
    capacity = Column(Integer, default=0)
    registered_count = Column(Integer, default=0)
    price = Column(Integer, default=0)
    description = Column(Text, default="")
    agenda = Column(JSON, default=list)
    free = Column(Boolean, default=False)
    expert_talk = Column(Boolean, default=False)
    published = Column(Boolean, default=False)
    # Denormalized
    instructor_name = Column(String, default="")
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Articles ────────────────────────────────────────────────────────────────
class Article(Base):
    __tablename__ = "articles"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    subtitle = Column(String, nullable=True)
    category = Column(String, default="")
    tags = Column(JSON, default=list)
    excerpt = Column(Text, default="")
    body = Column(Text, default="")
    author_name = Column(String, default="")
    featured_image = Column(String, nullable=True)
    accent = Column(String, default="teal")
    read_time = Column(Integer, default=5)
    published = Column(Boolean, default=False)
    featured = Column(Boolean, default=False)
    created_at = Column(Integer, default=0)
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Dictionary Terms ────────────────────────────────────────────────────────
class DictionaryTerm(Base):
    __tablename__ = "dictionary_terms"
    id = Column(String, primary_key=True)
    term = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    full_name = Column(String, default="")
    gram_status = Column(String, default="")
    shape = Column(String, default="")
    oxygen = Column(String, default="")
    habitat = Column(String, default="")
    diseases = Column(JSON, default=list)
    virulence = Column(JSON, default=list)
    diagnosis = Column(Text, default="")
    characteristics = Column(JSON, default=list)
    exam_notes = Column(JSON, default=list)
    sources = Column(JSON, default=list)
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Questions ───────────────────────────────────────────────────────────────
class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True)
    text = Column(Text, nullable=False)
    options = Column(JSON, default=list)
    correct_index = Column(Integer, default=0)
    explanation = Column(Text, default="")
    topic_id = Column(String, nullable=False)
    difficulty = Column(Integer, default=1)
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Exams ───────────────────────────────────────────────────────────────────
class Exam(Base):
    __tablename__ = "exams"
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    description = Column(Text, default="")
    duration_minutes = Column(Integer, default=30)
    question_ids = Column(JSON, default=list)
    free = Column(Boolean, default=False)
    published = Column(Boolean, default=False)
    featured = Column(Boolean, default=False)
    diagnostic = Column(Boolean, default=False)
    accent = Column(String, default="teal")
    order = Column(Integer, default=0)
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Daily Quiz ──────────────────────────────────────────────────────────────
class DailyQuiz(Base):
    __tablename__ = "daily_quiz"
    id = Column(String, primary_key=True)
    date = Column(String, unique=True, nullable=False)
    question_id = Column(String, nullable=False)
    points = Column(Integer, default=10)
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Testimonials ────────────────────────────────────────────────────────────
class Testimonial(Base):
    __tablename__ = "testimonials"
    id = Column(String, primary_key=True)
    name = Column(String, default="")
    role = Column(String, default="")
    text = Column(Text, default="")
    rating = Column(Integer, default=5)
    course = Column(String, default="")
    accent = Column(String, default="teal")
    synced_at = Column(DateTime, default=datetime.utcnow)


# ── Sync Log ────────────────────────────────────────────────────────────────
class SyncLog(Base):
    __tablename__ = "sync_log"
    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    status = Column(String, default="running")  # running | success | error
    tables_synced = Column(Integer, default=0)
    records_upserted = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)


# ── Offline Changes (queued when main site unreachable) ────────────────────
class OfflineChange(Base):
    __tablename__ = "offline_changes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    table_name = Column(String, nullable=False)
    record_id = Column(String, nullable=False)
    action = Column(String, nullable=False)  # create | update | delete
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    synced = Column(Boolean, default=False)
    synced_at = Column(DateTime, nullable=True)


# Create all tables
def init_db():
    Base.metadata.create_all(bind=engine)
