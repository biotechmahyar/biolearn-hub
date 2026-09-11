"""Auth routes — login / register / logout."""
from fastapi import APIRouter, Request, Form, Depends
from fastapi.responses import RedirectResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth.security import hash_password, verify_password, create_session_token
from app.auth.deps import COOKIE_NAME, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/login", response_class=HTMLResponse)
def login_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if user:
        return RedirectResponse("/dashboard", status_code=302)
    return templates.TemplateResponse("public/login.html", {"request": request, "error": None})


@router.post("/login")
def login_submit(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    next: str = Form(default=""),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return templates.TemplateResponse(
            "public/login.html",
            {"request": request, "error": "ایمیل یا رمز عبور اشتباه است"},
            status_code=401,
        )
    token = create_session_token(user.id)
    # Admin login: if next param is /admin and user is admin, go there
    if next and next.startswith("/") and not next.startswith("//"):
        redirect_url = next
    elif user.role in ("admin", "superadmin"):
        redirect_url = "/admin"
    else:
        redirect_url = "/dashboard"
    response = RedirectResponse(redirect_url, status_code=302)
    response.set_cookie(COOKIE_NAME, token, max_age=60 * 60 * 24 * 7, httponly=True, samesite="lax")
    return response


@router.get("/register", response_class=HTMLResponse)
def register_page(request: Request, db: Session = Depends(get_db)):
    user = get_current_user(request, db)
    if user:
        return RedirectResponse("/dashboard", status_code=302)
    return templates.TemplateResponse("public/register.html", {"request": request, "error": None})


@router.post("/register")
def register_submit(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return templates.TemplateResponse(
            "public/register.html",
            {"request": request, "error": "این ایمیل قبلاً ثبت شده است"},
            status_code=400,
        )
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role="student",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_session_token(user.id)
    response = RedirectResponse("/dashboard", status_code=302)
    response.set_cookie(COOKIE_NAME, token, max_age=60 * 60 * 24 * 7, httponly=True, samesite="lax")
    return response


@router.get("/logout")
def logout():
    response = RedirectResponse("/auth/login", status_code=302)
    response.delete_cookie(COOKIE_NAME)
    return response
