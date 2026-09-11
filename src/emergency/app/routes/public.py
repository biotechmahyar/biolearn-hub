"""Public pages — no auth required."""
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.course import Course, Category
from app.models.article import Article
from app.models.dictionary import DictionaryTerm
from app.models.workshop import Workshop
from app.models.product import Product
from app.auth.deps import get_current_user

router = APIRouter(tags=["public"])
templates = Jinja2Templates(directory="app/templates")


def _ctx(request: Request, db: Session, **extra):
    user = get_current_user(request, db)
    return {"request": request, "user": user, **extra}


@router.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    courses = db.query(Course).filter(Course.published == True).order_by(Course.created_at.desc()).limit(6).all()
    articles = db.query(Article).filter(Article.published == True).order_by(Article.created_at.desc()).limit(4).all()
    workshops = db.query(Workshop).filter(Workshop.published == True).order_by(Workshop.created_at.desc()).limit(3).all()
    return templates.TemplateResponse("public/home.html", _ctx(request, db, courses=courses, articles=articles, workshops=workshops))


@router.get("/courses", response_class=HTMLResponse)
def courses_page(request: Request, db: Session = Depends(get_db)):
    courses = db.query(Course).filter(Course.published == True).order_by(Course.created_at.desc()).all()
    categories = db.query(Category).filter(Category.published == True).order_by(Category.order).all()
    return templates.TemplateResponse("public/courses.html", _ctx(request, db, courses=courses, categories=categories))


@router.get("/courses/{slug}", response_class=HTMLResponse)
def course_detail(slug: str, request: Request, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.slug == slug).first()
    if not course:
        return templates.TemplateResponse("public/404.html", _ctx(request, db), status_code=404)
    return templates.TemplateResponse("public/course_detail.html", _ctx(request, db, course=course))


@router.get("/articles", response_class=HTMLResponse)
def articles_page(request: Request, db: Session = Depends(get_db)):
    articles = db.query(Article).filter(Article.published == True).order_by(Article.created_at.desc()).all()
    return templates.TemplateResponse("public/articles.html", _ctx(request, db, articles=articles))


@router.get("/articles/{slug}", response_class=HTMLResponse)
def article_detail(slug: str, request: Request, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.slug == slug).first()
    if not article:
        return templates.TemplateResponse("public/404.html", _ctx(request, db), status_code=404)
    return templates.TemplateResponse("public/article_detail.html", _ctx(request, db, article=article))


@router.get("/dictionary", response_class=HTMLResponse)
def dictionary_page(request: Request, q: str = "", db: Session = Depends(get_db)):
    query = db.query(DictionaryTerm)
    if q:
        query = query.filter(DictionaryTerm.term.ilike(f"%{q}%"))
    terms = query.order_by(DictionaryTerm.term).limit(200).all()
    return templates.TemplateResponse("public/dictionary.html", _ctx(request, db, terms=terms, q=q))


@router.get("/workshops", response_class=HTMLResponse)
def workshops_page(request: Request, db: Session = Depends(get_db)):
    workshops = db.query(Workshop).filter(Workshop.published == True).order_by(Workshop.created_at.desc()).all()
    return templates.TemplateResponse("public/workshops.html", _ctx(request, db, workshops=workshops))


@router.get("/products", response_class=HTMLResponse)
def products_page(request: Request, db: Session = Depends(get_db)):
    products = db.query(Product).filter(Product.published == True).order_by(Product.created_at.desc()).all()
    return templates.TemplateResponse("public/products.html", _ctx(request, db, products=products))
