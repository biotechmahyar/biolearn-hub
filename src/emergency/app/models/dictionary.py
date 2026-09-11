"""Dictionary term model."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime

from app.database import Base


def _uuid():
    return uuid.uuid4().hex


class DictionaryTerm(Base):
    __tablename__ = "dictionary_terms"

    id = Column(String(32), primary_key=True, default=_uuid)
    term = Column(String(500), nullable=False)
    fullName = Column(String(500), default="")
    gramStatus = Column(String(100), default="")
    shape = Column(String(255), default="")
    oxygen = Column(String(100), default="")
    habitat = Column(Text, default="")
    diseases = Column(Text, default="")
    virulence = Column(String(255), default="")
    diagnosis = Column(Text, default="")
    characteristics = Column(Text, default="")
    examNotes = Column(Text, default="")
    sources = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
