"""Password hashing + session tokens — stdlib only, no bcrypt external."""
import hashlib
import hmac
import os
import secrets
import time

from app.config import SECRET_KEY


def hash_password(password: str) -> str:
    """PBKDF2-SHA256 hash — stdlib only."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against stored hash."""
    if "$" not in password_hash:
        return False
    salt, stored_hex = password_hash.split("$", 1)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260_000)
    return hmac.compare_digest(dk.hex(), stored_hex)


def create_session_token(user_id: str) -> str:
    """Create a signed session token: uid$timestamp$hmac."""
    ts = str(int(time.time()))
    payload = f"{user_id}${ts}"
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    return f"{payload}${sig}"


def verify_session_token(token: str) -> str | None:
    """Verify session token and return user_id or None."""
    parts = token.split("$")
    if len(parts) != 3:
        return None
    user_id, ts, sig = parts
    payload = f"{user_id}${ts}"
    expected = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:32]
    if not hmac.compare_digest(sig, expected):
        return None
    # Token expires after 7 days
    try:
        if time.time() - int(ts) > 60 * 60 * 24 * 7:
            return None
    except (ValueError, OSError):
        return None
    return user_id
