"""Student dashboard — requires login."""
import json
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.enrollment import Enrollment, LessonProgress
from app.models.course import Course, CourseSection, CourseLesson
from app.models.order import Order
from app.auth.security import hash_password

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
templates = Jinja2Templates(directory="app/templates")


def _ctx(request: Request, user: User, **extra):
    return {"request": request, "user": user, **extra}


@router.get("", response_class=HTMLResponse)
def dashboard_home(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/auth/login", status_code=302)
    enrollments = db.query(Enrollment).filter(Enrollment.userId == user.id).all()
    # Enrich with course data
    enriched = []
    for e in enrollments:
        course = db.query(Course).filter(Course.id == e.courseId).first()
        if course:
            total = db.query(CourseLesson).join(CourseSection).filter(CourseSection.courseId == course.id).count()
            completed = len(json.loads(e.completedLessons or "[]"))
            pct = round(completed / total * 100) if total > 0 else 0
            enriched.append({"enrollment": e, "course": course, "percent": pct})
    return templates.TemplateResponse("student/dashboard.html", _ctx(request, user, enrollments=enriched))


@router.get("/courses/{course_id}", response_class=HTMLResponse)
def student_course_detail(course_id: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/auth/login", status_code=302)
    enrollment = db.query(Enrollment).filter(Enrollment.userId == user.id, Enrollment.courseId == course_id).first()
    if not enrollment:
        return RedirectResponse("/dashboard", status_code=302)
    course = db.query(Course).filter(Course.id == course_id).first()
    sections = db.query(CourseSection).filter(CourseSection.courseId == course_id).order_by(CourseSection.order).all()
    completed_ids = set(json.loads(enrollment.completedLessons or "[]"))
    section_data = []
    for s in sections:
        lessons = db.query(CourseLesson).filter(CourseLesson.sectionId == s.id).order_by(CourseLesson.order).all()
        section_data.append({"section": s, "lessons": lessons})
    total = sum(len(sd["lessons"]) for sd in section_data)
    done = len(completed_ids)
    pct = round(done / total * 100) if total > 0 else 0
    return templates.TemplateResponse("student/course_view.html", _ctx(
        request, user, course=course, sections=section_data,
        completed_ids=completed_ids, percent=pct, enrollment=enrollment,
    ))


@router.post("/courses/{course_id}/complete/{lesson_id}")
def mark_lesson_complete(course_id: str, lesson_id: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/auth/login", status_code=302)
    enrollment = db.query(Enrollment).filter(Enrollment.userId == user.id, Enrollment.courseId == course_id).first()
    if not enrollment:
        return RedirectResponse("/dashboard", status_code=302)
    completed = json.loads(enrollment.completedLessons or "[]")
    if lesson_id not in completed:
        completed.append(lesson_id)
        enrollment.completedLessons = json.dumps(completed)
        from datetime import datetime, timezone
        enrollment.lastActiveAt = datetime.now(timezone.utc)
        enrollment.lastLessonId = lesson_id
        db.commit()
    # Also update lesson_progress
    lp = db.query(LessonProgress).filter(
        LessonProgress.userId == user.id,
        LessonProgress.courseId == course_id,
        LessonProgress.lessonId == lesson_id,
    ).first()
    if not lp:
        from datetime import datetime, timezone
        lp = LessonProgress(userId=user.id, courseId=course_id, lessonId=lesson_id, completed=True, completedAt=datetime.now(timezone.utc))
        db.add(lp)
    else:
        lp.completed = True
    db.commit()
    return RedirectResponse(f"/dashboard/courses/{course_id}", status_code=302)


@router.get("/orders", response_class=HTMLResponse)
def student_orders(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/auth/login", status_code=302)
    orders = db.query(Order).filter(Order.userId == user.id).order_by(Order.createdAt.desc()).all()
    return templates.TemplateResponse("student/orders.html", _ctx(request, user, orders=orders))


@router.get("/profile", response_class=HTMLResponse)
def student_profile(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/auth/login", status_code=302)
    return templates.TemplateResponse("student/profile.html", _ctx(request, user, saved=False))


@router.post("/profile")
def update_profile(
    request: Request,
    name: str = "",
    phone: str = "",
    bio: str = "",
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)
    if not user:
        return RedirectResponse("/auth/login", status_code=302)
    user.name = name or user.name
    user.phone = phone or user.phone
    user.bio = bio
    db.commit()
    return templates.TemplateResponse("student/profile.html", _ctx(request, user, saved=True))
