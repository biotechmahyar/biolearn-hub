"""
Sync Service — polls the main site and upserts data into the local DB.
"""

import httpx
import os
import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.database import (
    Category, Instructor, Course, Product, Workshop, Article,
    DictionaryTerm, Question, Exam, DailyQuiz, Testimonial, SyncLog,
)

# Main site URL — where the Convex deployment lives
MAIN_SITE_URL = os.getenv("MAIN_SITE_URL", "https://nibrc.ir")
SYNC_API_KEY = os.getenv("SYNC_API_KEY", "changeme-sync-secret-key")
SYNC_TIMEOUT = int(os.getenv("SYNC_TIMEOUT", "60"))


def _fetch_main_site_data() -> dict | None:
    """Fetch all public data from the main site's sync endpoint."""
    try:
        resp = httpx.get(
            f"{MAIN_SITE_URL}/sync/data",
            headers={"X-Sync-Key": SYNC_API_KEY},
            timeout=SYNC_TIMEOUT,
            follow_redirects=True,
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"[SYNC] Failed to fetch from main site: {e}")
        return None


def _upsert_many(db: Session, model, records: list[dict], id_field: str = "id"):
    """Upsert a list of records into the database."""
    count = 0
    for rec in records:
        pk = rec.get(id_field)
        if not pk:
            continue
        existing = db.query(model).filter(model.id == pk).first()
        if existing:
            for key, value in rec.items():
                if hasattr(existing, key) and key != "id":
                    setattr(existing, key, value)
            existing.synced_at = datetime.utcnow()
        else:
            obj = model(id=pk, **{k: v for k, v in rec.items() if k != id_field and hasattr(model, k)})
            obj.synced_at = datetime.utcnow()
            db.add(obj)
        count += 1
    db.commit()
    return count


def _sync_table(db: Session, model, records: list[dict]) -> int:
    """Sync a single table from the main site data."""
    if not records:
        return 0
    return _upsert_many(db, model, records)


def run_full_sync(db: Session) -> dict:
    """
    Pull all public data from the main site and upsert into local DB.
    Returns a summary of the sync operation.
    """
    log = SyncLog(started_at=datetime.utcnow(), status="running")
    db.add(log)
    db.commit()

    data = _fetch_main_site_data()
    if not data:
        log.status = "error"
        log.error_message = "Failed to fetch data from main site"
        log.finished_at = datetime.utcnow()
        db.commit()
        return {"status": "error", "message": "Main site unreachable"}

    total_records = 0
    tables_synced = 0

    # Map table keys to models
    table_map = {
        "categories": Category,
        "instructors": Instructor,
        "courses": Course,
        "products": Product,
        "workshops": Workshop,
        "articles": Article,
        "dictionary_terms": DictionaryTerm,
        "questions": Question,
        "exams": Exam,
        "daily_quiz": DailyQuiz,
        "testimonials": Testimonial,
    }

    for key, model in table_map.items():
        records = data.get(key, [])
        if records:
            count = _sync_table(db, model, records)
            total_records += count
            tables_synced += 1
            print(f"[SYNC] {key}: {count} records upserted")

    log.status = "success"
    log.tables_synced = tables_synced
    log.records_upserted = total_records
    log.finished_at = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "tables_synced": tables_synced,
        "records_upserted": total_records,
        "timestamp": datetime.utcnow().isoformat(),
    }
