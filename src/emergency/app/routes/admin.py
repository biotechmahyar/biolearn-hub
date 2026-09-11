"""Admin dashboard — requires admin/superadmin role. All paths relative to /emergency."""
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.course import Course, Category, CourseSection, CourseLesson
from app.models.article import Article
from app.models.dictionary import DictionaryTerm
from app.models.workshop import Workshop
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.enrollment import Enrollment

router = APIRouter(prefix="/admin", tags=["admin"])
templates = Jinja2Templates(directory="app/templates")


def _ctx(request: Request, user: User, **extra):
    return {"request": request, "user": user, **extra}


def _require_admin(request: Request, db: Session):
    user = get_current_user(request, db)
    if not user or user.role not in ("admin", "superadmin"):
        return None
    return user


@router.get("/login", response_class=HTMLResponse)
def admin_login_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if user and user.role in ("admin", "superadmin"):
        return RedirectResponse("/emergency/admin", status_code=302)
    return templates.TemplateResponse("admin/login.html", {"request": request, "error": None})


@router.get("", response_class=HTMLResponse)
def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    if not user:
        return RedirectResponse("/emergency/admin/login", status_code=302)
    stats = {
        "users": db.query(User).count(),
        "courses": db.query(Course).count(),
        "articles": db.query(Article).count(),
        "enrollments": db.query(Enrollment).count(),
        "orders": db.query(Order).count(),
        "products": db.query(Product).count(),
        "workshops": db.query(Workshop).count(),
        "dictionary": db.query(DictionaryTerm).count(),
    }
    return templates.TemplateResponse("admin/dashboard.html", _ctx(request, user, stats=stats))


@router.get("/users", response_class=HTMLResponse)
def admin_users(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    if not user:
        return RedirectResponse("/emergency/admin/login", status_code=302)
    users = db.query(User).order_by(User.created_at.desc()).all()
    return templates.TemplateResponse("admin/users.html", _ctx(request, user, users=users))


@router.get("/courses", response_class=HTMLResponse)
def admin_courses(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    if not user:
        return RedirectResponse("/emergency/admin/login", status_code=302)
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    return templates.TemplateResponse("admin/courses.html", _ctx(request, user, courses=courses))


@router.get("/articles", response_class=HTMLResponse)
def admin_articles(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    if not user:
        return RedirectResponse("/emergency/admin/login", status_code=302)
    articles = db.query(Article).order_by(Article.created_at.desc()).all()
    return templates.TemplateResponse("admin/articles.html", _ctx(request, user, articles=articles))


@router.get("/dictionary", response_class=HTMLResponse)
def admin_dictionary(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    if not user:
        return RedirectResponse("/emergency/admin/login", status_code=302)
    terms = db.query(DictionaryTerm).order_by(DictionaryTerm.term).all()
    return templates.TemplateResponse("admin/dictionary.html", _ctx(request, user, terms=terms))


@router.get("/workshops", response_class=HTMLResponse)
def admin_workshops(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    if not user:
        return RedirectResponse("/emergency/admin/login", status_code=302)
    workshops = db.query(Workshop).order_by(Workshop.created_at.desc()).all()
    return templates.TemplateResponse("admin/workshops.html", _ctx(request, user, workshops=workshops))


@router.get("/products", response_class=HTMLResponse)
def admin_products(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    if not user:
        return RedirectResponse("/emergency/admin/login", status_code=302)
    products = db.query(Product).order_by(Product.created_at.desc()).all()
    return templates.TemplateResponse("admin/products.html", _ctx(request, user, products=products))


@router.get("/orders", response_class=HTMLResponse)
def admin_orders(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    if not user:
        return RedirectResponse("/emergency/admin/login", status_code=302)
    orders = db.query(Order).order_by(Order.createdAt.desc()).all()
    return templates.TemplateResponse("admin/orders.html", _ctx(request, user, orders=orders))
