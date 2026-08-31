"""
Offline write routes — handle user actions when the main site is unreachable.
Queues changes for later sync-back when connectivity returns.
"""

import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.database import (
    get_db, IranUser, IranEnrollment, IranExamAttempt, OfflineChange,
    Course, Exam,
)
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/offline", tags=["offline"])


def _require_user(authorization: str | None, db: Session) -> IranUser:
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(401, "وارد نشده‌اید.")
    return user


# ── Enroll in a course ──────────────────────────────────────────────────────
class EnrollRequest(BaseModel):
    courseId: str
    tier: str = "basic"
    amount: int = 0


@router.post("/enroll")
def enroll_course(req: EnrollRequest, authorization: str | None = None, db: Session = Depends(get_db)):
    user = _require_user(authorization, db)

    # Check if already enrolled
    existing = db.query(IranEnrollment).filter(
        IranEnrollment.user_id == user.id,
        IranEnrollment.course_id == req.courseId,
    ).first()
    if existing:
        raise HTTPException(400, "قبلاً در این دوره ثبت‌نام کرده‌اید.")

    # Get course title from mirrored data
    course = db.query(Course).filter(Course.id == req.courseId).first()
    course_title = course.title if course else ""

    enrollment = IranEnrollment(
        user_id=user.id,
        course_id=req.courseId,
        course_title=course_title,
        tier=req.tier,
        amount=req.amount,
        status="pending",
    )
    db.add(enrollment)

    # Queue offline change for sync-back
    change = OfflineChange(
        table_name="enrollments",
        record_id=f"iran-{user.id}-{req.courseId}",
        action="create",
        payload={
            "userId": user.id,
            "courseId": req.courseId,
            "tier": req.tier,
            "amount": req.amount,
        },
    )
    db.add(change)
    db.commit()

    return {"ok": True, "message": "ثبت‌نام ثبت شد. پس از تأیید مدیر سایت فعال می‌شود."}


# ── Get my enrollments ──────────────────────────────────────────────────────
@router.get("/enrollments")
def my_enrollments(authorization: str | None = None, db: Session = Depends(get_db)):
    user = _require_user(authorization, db)
    enrollments = db.query(IranEnrollment).filter(
        IranEnrollment.user_id == user.id
    ).order_by(IranEnrollment.created_at.desc()).all()
    return [
        {
            "id": e.id,
            "courseId": e.course_id,
            "courseTitle": e.course_title,
            "tier": e.tier,
            "amount": e.amount,
            "status": e.status,
            "createdAt": e.created_at.isoformat() if e.created_at else None,
        }
        for e in enrollments
    ]


# ── Submit exam attempt ─────────────────────────────────────────────────────
class ExamAttemptRequest(BaseModel):
    examId: str
    answers: list[dict]  # [{questionId, chosenIndex}]
    score: int
    total: int
    percent: float


@router.post("/exam-attempt")
def submit_exam_attempt(req: ExamAttemptRequest, authorization: str | None = None, db: Session = Depends(get_db)):
    user = _require_user(authorization, db)

    attempt = IranExamAttempt(
        user_id=user.id,
        exam_id=req.examId,
        answers=req.answers,
        score=req.score,
        total=req.total,
        percent=req.percent,
    )
    db.add(attempt)

    # Queue for sync
    change = OfflineChange(
        table_name="examAttempts",
        record_id=f"iran-{user.id}-{req.examId}-{int(time.time())}",
        action="create",
        payload={
            "userId": user.id,
            "examId": req.examId,
            "answers": req.answers,
            "score": req.score,
            "total": req.total,
            "percent": req.percent,
        },
    )
    db.add(change)
    db.commit()

    return {"ok": True, "attemptId": attempt.id}


# ── Get my exam attempts ────────────────────────────────────────────────────
@router.get("/exam-attempts")
def my_exam_attempts(authorization: str | None = None, db: Session = Depends(get_db)):
    user = _require_user(authorization, db)
    attempts = db.query(IranExamAttempt).filter(
        IranExamAttempt.user_id == user.id
    ).order_by(IranExamAttempt.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "examId": a.exam_id,
            "score": a.score,
            "total": a.total,
            "percent": a.percent,
            "createdAt": a.created_at.isoformat() if a.created_at else None,
        }
        for a in attempts
    ]


# ── Sync-back: push offline changes to main site ───────────────────────────
@router.post("/sync-back")
def sync_back(authorization: str | None = None, db: Session = Depends(get_db)):
    """
    Push all pending offline changes to the main site.
    Called when connectivity is restored.
    """
    user = _require_user(authorization, db)
    if user.role not in ("admin", "site_admin"):
        raise HTTPException(403, "فقط مدیر سایت می‌تواند sync-back انجام دهد.")

    pending = db.query(OfflineChange).filter(OfflineChange.synced == False).all()
    if not pending:
        return {"ok": True, "message": "تغییری برای ارسال وجود ندارد.", "count": 0}

    import httpx
    import os

    MAIN_SITE_URL = os.getenv("MAIN_SITE_URL", "https://genova.nibrc.ir")
    SYNC_API_KEY = os.getenv("SYNC_API_KEY", "changeme-sync-secret-key")

    synced_count = 0
    errors = []

    for change in pending:
        try:
            resp = httpx.post(
                f"{MAIN_SITE_URL}/api/sync/push",
                headers={"X-Sync-Key": SYNC_API_KEY},
                json={
                    "table": change.table_name,
                    "recordId": change.record_id,
                    "action": change.action,
                    "payload": change.payload,
                },
                timeout=30,
            )
            if resp.status_code == 200:
                change.synced = True
                change.synced_at = __import__("datetime").datetime.utcnow()
                synced_count += 1
            else:
                errors.append(f"{change.table_name}: {resp.status_code}")
        except Exception as e:
            errors.append(f"{change.table_name}: {str(e)}")

    db.commit()

    return {
        "ok": len(errors) == 0,
        "synced": synced_count,
        "errors": errors,
        "remaining": len(pending) - synced_count,
    }


# ── Check sync status ──────────────────────────────────────────────────────
@router.get("/sync-status")
def offline_sync_status(authorization: str | None = None, db: Session = Depends(get_db)):
    user = _require_user(authorization, db)
    pending = db.query(OfflineChange).filter(OfflineChange.synced == False).count()
    total = db.query(OfflineChange).count()
    return {"pending": pending, "total": total}
