"""
Content API routes — serves mirrored data from the local database.
These endpoints mirror the public Convex queries from the main site.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.models.database import (
    get_db, Category, Instructor, Course, Product, Workshop,
    Article, DictionaryTerm, Exam, DailyQuiz, Testimonial, Question,
)

router = APIRouter(prefix="/api/content", tags=["content"])


# ── Categories ──────────────────────────────────────────────────────────────
@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).order_by(Category.order).all()
    return [cat_to_dict(c) for c in cats]


# ── Courses ─────────────────────────────────────────────────────────────────
@router.get("/courses")
def list_courses(
    category_slug: str | None = None,
    search: str | None = None,
    featured_only: bool = False,
    popular_only: bool = False,
    limit: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Course).filter(Course.published == True)
    if featured_only:
        q = q.filter(Course.featured == True)
    if popular_only:
        q = q.filter(Course.popular == True)
    if category_slug:
        q = q.filter(Course.category_slug == category_slug)
    if search:
        s = search.strip().lower()
        q = q.filter(Course.title.ilike(f"%{s}%"))
    courses = q.order_by(Course.featured.desc(), Course.created_at.desc()).all()
    if limit:
        courses = courses[:limit]
    return [course_to_dict(c) for c in courses]


@router.get("/courses/{slug}")
def get_course_by_slug(slug: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.slug == slug, Course.published == True).first()
    if not course:
        return None
    return course_to_dict(course, full=True)


# ── Instructors ─────────────────────────────────────────────────────────────
@router.get("/instructors")
def list_instructors(db: Session = Depends(get_db)):
    instructors = db.query(Instructor).all()
    return [instructor_to_dict(i) for i in instructors]


@router.get("/instructors/{slug}")
def get_instructor_by_slug(slug: str, db: Session = Depends(get_db)):
    instructor = db.query(Instructor).filter(Instructor.slug == slug).first()
    if not instructor:
        return None
    courses = db.query(Course).filter(
        Course.instructor_id == instructor.id, Course.published == True
    ).all()
    workshops = db.query(Workshop).filter(Workshop.instructor_id == instructor.id).all()
    return {
        **instructor_to_dict(instructor),
        "courses": [course_to_dict(c) for c in courses],
        "workshops": [workshop_to_dict(w) for w in workshops],
    }


# ── Products ────────────────────────────────────────────────────────────────
@router.get("/products")
def list_products(featured_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Product).filter(Product.published == True)
    if featured_only:
        q = q.filter(Product.featured == True)
    products = q.order_by(Product.created_at.desc()).all()
    return [product_to_dict(p) for p in products]


@router.get("/products/{slug}")
def get_product_by_slug(slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.slug == slug, Product.published == True).first()
    if not product:
        return None
    return product_to_dict(product)


# ── Workshops ───────────────────────────────────────────────────────────────
@router.get("/workshops")
def list_workshops(db: Session = Depends(get_db)):
    workshops = db.query(Workshop).filter(Workshop.published == True).all()
    workshops.sort(key=lambda w: w.date)
    return [workshop_to_dict(w) for w in workshops]


@router.get("/workshops/{slug}")
def get_workshop_by_slug(slug: str, db: Session = Depends(get_db)):
    workshop = db.query(Workshop).filter(Workshop.slug == slug, Workshop.published == True).first()
    if not workshop:
        return None
    return workshop_to_dict(workshop, full=True)


# ── Articles ────────────────────────────────────────────────────────────────
@router.get("/articles")
def list_articles(
    category: str | None = None,
    limit: int | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Article).filter(Article.published == True)
    if category:
        q = q.filter(Article.category == category)
    articles = q.order_by(Article.created_at.desc()).all()
    if limit:
        articles = articles[:limit]
    return [article_to_dict(a) for a in articles]


@router.get("/articles/{slug}")
def get_article_by_slug(slug: str, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.slug == slug, Article.published == True).first()
    if not article:
        return None
    return article_to_dict(article)


# ── Dictionary ──────────────────────────────────────────────────────────────
@router.get("/dictionary")
def search_dictionary(
    q: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    query = db.query(DictionaryTerm)
    if q:
        s = q.strip().lower()
        query = query.filter(
            DictionaryTerm.term.ilike(f"%{s}%") |
            DictionaryTerm.full_name.ilike(f"%{s}%")
        )
    terms = query.limit(limit).all()
    return [term_to_dict(t) for t in terms]


# ── Exams (public listing) ─────────────────────────────────────────────────
@router.get("/exams")
def list_exams(db: Session = Depends(get_db)):
    exams = db.query(Exam).filter(Exam.published == True).order_by(Exam.order).all()
    return [{"id": e.id, "title": e.title, "slug": e.slug, "description": e.description,
             "durationMinutes": e.duration_minutes, "free": e.free,
             "featured": e.featured, "accent": e.accent, "questionCount": len(e.question_ids or [])}
            for e in exams]


@router.get("/daily-quiz")
def get_daily_quiz(db: Session = Depends(get_db)):
    import datetime as dt
    today = dt.date.today().isoformat()
    quiz = db.query(DailyQuiz).filter(DailyQuiz.date == today).first()
    if not quiz:
        return None
    question = db.query(Question).filter(Question.id == quiz.question_id).first()
    if not question:
        return None
    return {
        "id": quiz.id,
        "date": quiz.date,
        "points": quiz.points,
        "question": question_to_dict(question),
    }


# ── Testimonials ────────────────────────────────────────────────────────────
@router.get("/testimonials")
def list_testimonials(db: Session = Depends(get_db)):
    testimonials = db.query(Testimonial).all()
    return [{"id": t.id, "name": t.name, "role": t.role, "text": t.text,
             "rating": t.rating, "course": t.course, "accent": t.accent}
            for t in testimonials]


# ── Converters ──────────────────────────────────────────────────────────────

def cat_to_dict(c: Category) -> dict:
    return {"_id": c.id, "name": c.name, "slug": c.slug, "description": c.description,
            "icon": c.icon, "accent": c.accent, "order": c.order}


def instructor_to_dict(i: Instructor) -> dict:
    return {"_id": i.id, "name": i.name, "slug": i.slug, "title": i.title,
            "bio": i.bio, "education": i.education, "specialties": i.specialties,
            "accent": i.accent, "verified": i.verified}


def course_to_dict(c: Course, full: bool = False) -> dict:
    d = {
        "_id": c.id, "title": c.title, "slug": c.slug,
        "summary": c.summary, "description": c.description,
        "durationText": c.duration_text, "mode": c.mode,
        "price": c.price, "discountPrice": c.discount_price,
        "rating": c.rating, "ratingCount": c.rating_count,
        "studentsCount": c.students_count, "accent": c.accent,
        "bundle": c.bundle, "includes": c.includes,
        "hasSampleVideo": c.has_sample_video, "published": c.published,
        "featured": c.featured, "popular": c.popular, "createdAt": c.created_at,
        "category": {"name": c.category_name, "slug": c.category_slug} if c.category_name else None,
        "instructor": {"name": c.instructor_name, "slug": c.instructor_slug} if c.instructor_name else None,
    }
    if full:
        d.update({
            "audience": c.audience, "prerequisites": c.prerequisites,
            "syllabus": c.syllabus, "files": c.files,
        })
    return d


def product_to_dict(p: Product) -> dict:
    return {"_id": p.id, "title": p.title, "slug": p.slug, "type": p.type,
            "description": p.description, "price": p.price, "accent": p.accent,
            "published": p.published, "featured": p.featured, "createdAt": p.created_at}


def workshop_to_dict(w: Workshop, full: bool = False) -> dict:
    d = {"_id": w.id, "title": w.title, "slug": w.slug, "topic": w.topic,
         "date": w.date, "time": w.time, "capacity": w.capacity,
         "registeredCount": w.registered_count, "price": w.price,
         "description": w.description, "free": w.free, "expertTalk": w.expert_talk,
         "published": w.published,
         "instructor": {"name": w.instructor_name} if w.instructor_name else None}
    if full:
        d["agenda"] = w.agenda
    return d


def article_to_dict(a: Article) -> dict:
    return {"_id": a.id, "title": a.title, "slug": a.slug, "subtitle": a.subtitle,
            "category": a.category, "tags": a.tags, "excerpt": a.excerpt,
            "body": a.body, "authorName": a.author_name, "featuredImage": a.featured_image,
            "accent": a.accent, "readTime": a.read_time, "published": a.published,
            "featured": a.featured, "createdAt": a.created_at}


def term_to_dict(t: DictionaryTerm) -> dict:
    return {"_id": t.id, "term": t.term, "slug": t.slug, "fullName": t.full_name,
            "gramStatus": t.gram_status, "shape": t.shape, "oxygen": t.oxygen,
            "habitat": t.habitat, "diseases": t.diseases, "virulence": t.virulence,
            "diagnosis": t.diagnosis, "characteristics": t.characteristics,
            "examNotes": t.exam_notes, "sources": t.sources}


def question_to_dict(q: Question) -> dict:
    return {"_id": q.id, "text": q.text, "options": q.options,
            "correctIndex": q.correct_index, "explanation": q.explanation,
            "topicId": q.topic_id, "difficulty": q.difficulty}
