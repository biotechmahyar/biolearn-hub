"""
Sync management routes — trigger manual sync and view sync status.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db, SyncLog
from app.services.sync_service import run_full_sync

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/trigger")
def trigger_sync(db: Session = Depends(get_db)):
    """Manually trigger a full sync from the main site."""
    result = run_full_sync(db)
    return result


@router.get("/status")
def sync_status(db: Session = Depends(get_db)):
    """Get the latest sync log entries."""
    logs = db.query(SyncLog).order_by(SyncLog.started_at.desc()).limit(10).all()
    return [
        {
            "id": log.id,
            "startedAt": log.started_at.isoformat() if log.started_at else None,
            "finishedAt": log.finished_at.isoformat() if log.finished_at else None,
            "status": log.status,
            "tablesSynced": log.tables_synced,
            "recordsUpserted": log.records_upserted,
            "error": log.error_message,
        }
        for log in logs
    ]
