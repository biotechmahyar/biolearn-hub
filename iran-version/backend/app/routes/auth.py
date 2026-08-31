"""
Auth routes — local JWT auth for the Iran mirror site.
Used when the main site is unreachable (offline mode).
"""

import hashlib
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.models.database import get_db, IranUser

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple JWT-like token (for demo — use proper JWT in production)
_tokens: dict[str, dict] = {}


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _create_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    _tokens[token] = {"user_id": user_id, "created_at": time.time()}
    return token


def _verify_token(token: str) -> dict | None:
    data = _tokens.get(token)
    if not data:
        return None
    # Expire after 7 days
    if time.time() - data["created_at"] > 7 * 86400:
        _tokens.pop(token, None)
        return None
    return data


def get_current_user(token: str | None = None, db: Session = None) -> IranUser | None:
    """Extract current user from Authorization header."""
    if not token or not db:
        return None
    token = token.replace("Bearer ", "")
    data = _verify_token(token)
    if not data:
        return None
    return db.query(IranUser).filter(IranUser.id == data["user_id"]).first()


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(IranUser).filter(IranUser.email == req.email).first()
    if existing:
        raise HTTPException(400, "این ایمیل قبلاً ثبت شده.")

    user = IranUser(
        name=req.name,
        email=req.email,
        password_hash=_hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _create_token(user.id)
    return {
        "ok": True,
        "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(IranUser).filter(IranUser.email == req.email).first()
    if not user or user.password_hash != _hash_password(req.password):
        raise HTTPException(401, "ایمیل یا رمز عبور اشتباه است.")

    token = _create_token(user.id)
    return {
        "ok": True,
        "token": token,
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
    }


@router.get("/me")
def get_me(authorization: str | None = None, db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(401, "وارد نشده‌اید.")
    user = get_current_user(authorization, db)
    if not user:
        raise HTTPException(401, "توکن نامعتبر است.")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "mainSiteUserId": user.main_site_user_id,
    }
