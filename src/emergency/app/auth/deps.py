"""Auth dependencies — get current user from cookie session."""
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth.security import verify_session_token

COOKIE_NAME = "nibrc_session"


def get_current_user(request: Request, db: Session = next(get_db())) -> User | None:
    """Extract user from session cookie. Returns None if not logged in."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    user_id = verify_session_token(token)
    if not user_id:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    return user


def require_auth(request: Request, db: Session = next(get_db())) -> User:
    """Require authenticated user or raise 401."""
    user = get_current_user(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="ورود لازم است")
    return user


def require_admin(request: Request, db: Session = next(get_db())) -> User:
    """Require admin or superadmin role."""
    user = require_auth(request, db)
    if user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="دسترسی مدیر لازم است")
    return user
