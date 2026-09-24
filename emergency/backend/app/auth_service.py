"""Authentication service for the independent emergency site.

The service is designed to consume the credential/session records produced by
later Genova snapshot export phases. It supports local emergency sessions and
transferred opaque/JWT token records without importing the main application.
"""
from __future__ import annotations

from dataclasses import dataclass
import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any

from .db import connect


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    username: str | None
    email: str | None
    role: str
    status: str


class AuthError(Exception):
    """Base error for expected authentication failures."""


class InvalidCredentials(AuthError):
    pass


class InvalidToken(AuthError):
    pass


class UnsupportedPasswordAlgorithm(AuthError):
    pass


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _now() -> int:
    return int(time.time())


def _constant_time_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))


def _decode_parts(value: str) -> list[str]:
    return value.split("$")


def verify_password(
    password: str,
    password_hash: str | None,
    algorithm: str | None,
) -> bool:
    """Verify an imported password record.

    The portable formats used by the exporter are:
      pbkdf2_sha256$iterations$salt$hash
      scrypt$n$r$p$salt$hash
      sha256$hash

    Optional bcrypt/Argon2 libraries are supported when their algorithm is
    recorded in the snapshot. `plaintext` exists only for legacy migration
    records that explicitly carry that algorithm.
    """
    if password_hash is None:
        return False
    normalized_algorithm = (algorithm or "auto").strip().lower()

    if normalized_algorithm == "auto":
        normalized_algorithm = (password_hash.split("$", 1)[0] or "").lower()
        if normalized_algorithm not in {"pbkdf2_sha256", "scrypt", "sha256"}:
            normalized_algorithm = "portable"

    if normalized_algorithm == "plaintext":
        return _constant_time_equal(password, password_hash)

    if normalized_algorithm == "sha256":
        digest = password_hash.split("$", 1)[-1]
        return _constant_time_equal(hashlib.sha256(password.encode("utf-8")).hexdigest(), digest)

    if normalized_algorithm == "pbkdf2_sha256":
        parts = _decode_parts(password_hash)
        if len(parts) != 4:
            return False
        _, iterations, salt, expected = parts
        try:
            iteration_count = int(iterations)
            if iteration_count <= 0:
                return False
            derived = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), salt.encode("utf-8"), iteration_count
            ).hex()
        except (TypeError, ValueError, OverflowError):
            return False
        return _constant_time_equal(derived, expected)

    if normalized_algorithm == "scrypt":
        parts = _decode_parts(password_hash)
        if len(parts) != 6:
            return False
        _, n, r, p, salt, expected = parts
        try:
            expected_bytes = base64.b64decode(expected, validate=True)
            if not expected_bytes:
                return False
            derived = hashlib.scrypt(
                password.encode("utf-8"),
                salt=salt.encode("utf-8"),
                n=int(n),
                r=int(r),
                p=int(p),
                dklen=len(expected_bytes),
            )
        except (TypeError, ValueError, OverflowError, base64.binascii.Error):
            return False
        return hmac.compare_digest(base64.b64encode(derived).decode("ascii"), expected)

    if normalized_algorithm in {"bcrypt", "bcrypt_sha256"}:
        try:
            import bcrypt  # type: ignore
        except ImportError as error:
            raise UnsupportedPasswordAlgorithm("bcrypt runtime is not installed") from error
        encoded = password_hash.encode("utf-8")
        return bcrypt.checkpw(password.encode("utf-8"), encoded)

    if normalized_algorithm in {"argon2", "argon2id"}:
        try:
            from argon2 import PasswordHasher  # type: ignore
        except ImportError as error:
            raise UnsupportedPasswordAlgorithm("argon2 runtime is not installed") from error
        try:
            return bool(PasswordHasher().verify(password_hash, password))
        except Exception:
            return False

    if normalized_algorithm == "portable":
        # Some source exports may preserve a JSON credential record.
        try:
            record = json.loads(password_hash)
            record_algorithm = str(record.get("algorithm", "")).lower()
            record_hash = str(record.get("hash", ""))
            return verify_password(password, record_hash, record_algorithm)
        except (TypeError, ValueError, json.JSONDecodeError):
            return False

    raise UnsupportedPasswordAlgorithm(normalized_algorithm)


class AuthService:
    def __init__(self) -> None:
        self._jwt: Any | None = None

    def _decode_jwt(self, token: str) -> Any | None:
        if self._jwt is None:
            try:
                import jwt  # type: ignore
            except ImportError:
                return None
            self._jwt = jwt
        return self._jwt

    def upsert_user(
        self,
        *,
        user_id: str,
        username: str | None,
        email: str | None,
        role: str,
        status: str = "active",
        created_at: int | None = None,
    ) -> None:
        timestamp = created_at or _now()
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_users
                    (id, username, email, role, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    username=excluded.username,
                    email=excluded.email,
                    role=excluded.role,
                    status=excluded.status,
                    updated_at=excluded.updated_at
                """,
                (user_id, username, email, role, status, timestamp, timestamp),
            )

    def upsert_password_account(
        self,
        *,
        account_id: str,
        user_id: str,
        identifier: str,
        password_hash: str,
        password_algorithm: str,
        provider: str = "password",
    ) -> None:
        timestamp = _now()
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_auth_accounts
                    (id, user_id, provider, identifier, password_hash,
                     password_algorithm, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id=excluded.user_id,
                    provider=excluded.provider,
                    identifier=excluded.identifier,
                    password_hash=excluded.password_hash,
                    password_algorithm=excluded.password_algorithm,
                    updated_at=excluded.updated_at
                """,
                (
                    account_id,
                    user_id,
                    provider,
                    identifier,
                    password_hash,
                    password_algorithm,
                    timestamp,
                    timestamp,
                ),
            )

    def upsert_session(
        self,
        *,
        session_id: str,
        user_id: str,
        access_token: str,
        refresh_token: str | None,
        issued_at: int,
        expires_at: int,
        refresh_expires_at: int | None = None,
        revoked_at: int | None = None,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> None:
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_auth_sessions
                    (id, user_id, token_value, refresh_token_value, token_hash,
                     refresh_token_hash, issued_at, expires_at, refresh_expires_at,
                     revoked_at, user_agent, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id=excluded.user_id,
                    token_value=excluded.token_value,
                    refresh_token_value=excluded.refresh_token_value,
                    token_hash=excluded.token_hash,
                    refresh_token_hash=excluded.refresh_token_hash,
                    issued_at=excluded.issued_at,
                    expires_at=excluded.expires_at,
                    refresh_expires_at=excluded.refresh_expires_at,
                    revoked_at=excluded.revoked_at,
                    user_agent=excluded.user_agent,
                    ip_address=excluded.ip_address
                """,
                (
                    session_id,
                    user_id,
                    access_token,
                    refresh_token,
                    _hash_token(access_token),
                    _hash_token(refresh_token) if refresh_token else None,
                    issued_at,
                    expires_at,
                    refresh_expires_at,
                    revoked_at,
                    user_agent,
                    ip_address,
                ),
            )

    def upsert_token(
        self,
        *,
        token_id: str,
        user_id: str,
        kind: str,
        token_value: str | None,
        issued_at: int,
        expires_at: int | None = None,
        revoked_at: int | None = None,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Insert an opaque or JWT-associated token from an auth snapshot."""
        if kind not in {"access", "refresh"}:
            raise ValueError("kind must be access or refresh")
        if token_value is None:
            raise ValueError("token_value is required")
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_auth_tokens
                    (id, user_id, kind, token_value, token_hash, issued_at,
                     expires_at, revoked_at, session_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id=excluded.user_id,
                    kind=excluded.kind,
                    token_value=excluded.token_value,
                    token_hash=excluded.token_hash,
                    issued_at=excluded.issued_at,
                    expires_at=excluded.expires_at,
                    revoked_at=excluded.revoked_at,
                    session_id=excluded.session_id,
                    metadata_json=excluded.metadata_json
                """,
                (
                    token_id,
                    user_id,
                    kind,
                    token_value,
                    _hash_token(token_value),
                    issued_at,
                    expires_at,
                    revoked_at,
                    session_id,
                    json.dumps(metadata, separators=(",", ":")) if metadata else None,
                ),
            )

    def upsert_signing_key(
        self,
        *,
        name: str,
        key_id: str,
        value: str,
        algorithm: str,
        issuer: str | None = None,
        audience: str | None = None,
    ) -> None:
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_auth_keys
                    (name, key_id, value, algorithm, issuer, audience, active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                ON CONFLICT(name) DO UPDATE SET
                    key_id=excluded.key_id,
                    value=excluded.value,
                    algorithm=excluded.algorithm,
                    issuer=excluded.issuer,
                    audience=excluded.audience,
                    active=1
                """,
                (name, key_id, value, algorithm, issuer, audience, _now()),
            )

    def authenticate(self, identifier: str, password: str) -> AuthenticatedUser:
        normalized = identifier.strip().lower()
        with connect() as connection:
            user_row = connection.execute(
                """
                SELECT id, username, email, role, status
                FROM emergency_users
                WHERE status = 'active' AND (lower(username) = ? OR lower(email) = ?)
                LIMIT 1
                """,
                (normalized, normalized),
            ).fetchone()
            if user_row is None:
                raise InvalidCredentials("invalid_credentials")
            account_rows = connection.execute(
                """
                SELECT password_hash, password_algorithm
                FROM emergency_auth_accounts
                WHERE user_id = ? AND provider = 'password'
                """,
                (user_row["id"],),
            ).fetchall()

        for account in account_rows:
            if verify_password(password, account["password_hash"], account["password_algorithm"]):
                return AuthenticatedUser(
                    id=user_row["id"],
                    username=user_row["username"],
                    email=user_row["email"],
                    role=user_row["role"],
                    status=user_row["status"],
                )
        raise InvalidCredentials("invalid_credentials")

    def create_local_session(
        self,
        user: AuthenticatedUser,
        *,
        lifetime_seconds: int = 60 * 60 * 24 * 7,
        refresh_lifetime_seconds: int = 60 * 60 * 24 * 30,
    ) -> dict[str, Any]:
        now = _now()
        access_token = secrets.token_urlsafe(48)
        refresh_token = secrets.token_urlsafe(64)
        session_id = secrets.token_hex(16)
        self.upsert_session(
            session_id=session_id,
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            issued_at=now,
            expires_at=now + lifetime_seconds,
            refresh_expires_at=now + refresh_lifetime_seconds,
        )
        return {
            "sessionId": session_id,
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "tokenType": "Bearer",
            "expiresIn": lifetime_seconds,
        }

    def authenticate_bearer(self, token: str) -> AuthenticatedUser:
        token_hash = _hash_token(token)
        now = _now()
        with connect() as connection:
            row = connection.execute(
                """
                SELECT s.user_id, s.expires_at, s.revoked_at
                FROM emergency_auth_sessions s
                WHERE s.token_hash = ?
                LIMIT 1
                """,
                (token_hash,),
            ).fetchone()
            if row is not None:
                if row["revoked_at"] is not None or row["expires_at"] <= now:
                    raise InvalidToken("invalid_token")
                return self._get_user(connection, row["user_id"])

            token_row = connection.execute(
                """
                SELECT user_id, expires_at, revoked_at
                FROM emergency_auth_tokens
                WHERE token_hash = ? AND kind = 'access'
                LIMIT 1
                """,
                (token_hash,),
            ).fetchone()
            if token_row is not None:
                if token_row["revoked_at"] is not None or (
                    token_row["expires_at"] is not None and token_row["expires_at"] <= now
                ):
                    raise InvalidToken("invalid_token")
                return self._get_user(connection, token_row["user_id"])

        return self._authenticate_jwt(token)

    def refresh_session(self, refresh_token: str) -> dict[str, Any]:
        token_hash = _hash_token(refresh_token)
        now = _now()
        with connect() as connection:
            row = connection.execute(
                """
                SELECT id, user_id, refresh_expires_at, revoked_at
                FROM emergency_auth_sessions
                WHERE refresh_token_hash = ?
                LIMIT 1
                """,
                (token_hash,),
            ).fetchone()
            if row is not None:
                if row["revoked_at"] is not None:
                    raise InvalidToken("invalid_refresh_token")
                if row["refresh_expires_at"] is not None and row["refresh_expires_at"] <= now:
                    raise InvalidToken("invalid_refresh_token")
                session_id = str(row["id"])
                user = self._get_user(connection, row["user_id"])
            else:
                token_row = connection.execute(
                    """
                    SELECT id, user_id, expires_at, revoked_at, session_id
                    FROM emergency_auth_tokens
                    WHERE token_hash = ? AND kind = 'refresh'
                    LIMIT 1
                    """,
                    (token_hash,),
                ).fetchone()
                if token_row is None or token_row["revoked_at"] is not None:
                    raise InvalidToken("invalid_refresh_token")
                if token_row["expires_at"] is not None and token_row["expires_at"] <= now:
                    raise InvalidToken("invalid_refresh_token")
                user = self._get_user(connection, token_row["user_id"])
                session_id = token_row["session_id"]
                if session_id:
                    session = connection.execute(
                        "SELECT revoked_at FROM emergency_auth_sessions WHERE id = ?",
                        (session_id,),
                    ).fetchone()
                    if session is None or session["revoked_at"] is not None:
                        raise InvalidToken("invalid_refresh_token")

        result = self.create_local_session(user)
        if session_id:
            self.revoke_session(str(session_id))
        # Revoke the imported refresh record as well, preventing replay of a
        # token whose session id was not present in the snapshot.
        with connect() as connection:
            connection.execute(
                "UPDATE emergency_auth_tokens SET revoked_at = ? WHERE token_hash = ? AND kind = 'refresh' AND revoked_at IS NULL",
                (now, token_hash),
            )
        return result

    def revoke_session(self, session_id: str) -> None:
        with connect() as connection:
            connection.execute(
                "UPDATE emergency_auth_sessions SET revoked_at = ? WHERE id = ?",
                (_now(), session_id),
            )

    def revoke_access_token(self, access_token: str) -> bool:
        """Revoke a local or imported access token idempotently.

        The return value is false for an unknown token, but an already revoked
        token is still considered successfully logged out.
        """
        now = _now()
        token_hash = _hash_token(access_token)
        with connect() as connection:
            connection.execute(
                "UPDATE emergency_auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
                (now, token_hash),
            )
            connection.execute(
                "UPDATE emergency_auth_tokens SET revoked_at = ? WHERE token_hash = ? AND kind = 'access' AND revoked_at IS NULL",
                (now, token_hash),
            )
            return connection.execute(
                "SELECT 1 FROM emergency_auth_sessions WHERE token_hash = ? UNION ALL SELECT 1 FROM emergency_auth_tokens WHERE token_hash = ? LIMIT 1",
                (token_hash, token_hash),
            ).fetchone() is not None

    def _get_user(self, connection: Any, user_id: str) -> AuthenticatedUser:
        row = connection.execute(
            """
            SELECT id, username, email, role, status
            FROM emergency_users WHERE id = ? LIMIT 1
            """,
            (user_id,),
        ).fetchone()
        if row is None or row["status"] != "active":
            raise InvalidToken("invalid_user")
        return AuthenticatedUser(
            id=row["id"],
            username=row["username"],
            email=row["email"],
            role=row["role"],
            status=row["status"],
        )

    def _authenticate_jwt(self, token: str) -> AuthenticatedUser:
        jwt_module = self._decode_jwt(token)
        if jwt_module is None:
            raise InvalidToken("jwt_runtime_unavailable")
        try:
            header = jwt_module.get_unverified_header(token)
            claims = jwt_module.get_unverified_claims(token)
        except Exception as error:
            raise InvalidToken("invalid_jwt") from error

        key_id = str(header.get("kid", ""))
        with connect() as connection:
            if key_id:
                key = connection.execute(
                    "SELECT value, algorithm, issuer, audience FROM emergency_auth_keys WHERE key_id = ? AND active = 1 LIMIT 1",
                    (key_id,),
                ).fetchone()
            else:
                key = connection.execute(
                    "SELECT value, algorithm, issuer, audience FROM emergency_auth_keys WHERE active = 1 ORDER BY created_at DESC LIMIT 1"
                ).fetchone()
            if key is None:
                raise InvalidToken("signing_key_not_found")
            try:
                verified = jwt_module.decode(
                    token,
                    key["value"],
                    algorithms=[key["algorithm"]],
                    issuer=key["issuer"] or None,
                    audience=key["audience"] or None,
                    options={
                        "verify_aud": bool(key["audience"]),
                        "verify_iss": bool(key["issuer"]),
                    },
                )
            except Exception as error:
                raise InvalidToken("invalid_jwt") from error
            subject = verified.get("sub")
            if not subject:
                raise InvalidToken("jwt_subject_missing")
            if verified.get("type") not in {None, "access"}:
                raise InvalidToken("invalid_token_type")
            if claims.get("exp") and int(claims["exp"]) <= _now():
                raise InvalidToken("invalid_jwt")
            return self._get_user(connection, str(subject))


_auth_service: AuthService | None = None


def get_auth_service() -> AuthService:
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service
