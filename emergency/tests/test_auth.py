import base64
import hashlib
import time

import jwt
from fastapi.testclient import TestClient

from app.auth_service import AuthService, verify_password
from app.main import app


client = TestClient(app)


def seed_user(service: AuthService, user_id: str = "user-1") -> None:
    username = "ali" if user_id == "user-1" else f"ali-{user_id}"
    email = "ali@example.test" if user_id == "user-1" else f"ali-{user_id}@example.test"
    service.upsert_user(
        user_id=user_id,
        username=username,
        email=email,
        role="admin",
        status="active",
    )
    salt = b"emergency-salt"
    digest = hashlib.pbkdf2_hmac("sha256", b"correct horse", salt, 120_000).hex()
    service.upsert_password_account(
        account_id="account-1",
        user_id=user_id,
        identifier=email,
        password_hash=f"pbkdf2_sha256$120000${salt.decode()}${digest}",
        password_algorithm="pbkdf2_sha256",
    )


def test_password_formats_and_malformed_hashes() -> None:
    assert verify_password("secret", hashlib.sha256(b"secret").hexdigest(), "sha256")
    encoded = base64.b64encode(hashlib.scrypt(b"secret", salt=b"salt", n=2**14, r=8, p=1, dklen=32)).decode()
    assert verify_password("secret", f"scrypt$16384$8$1$salt${encoded}", "scrypt")
    portable = '{"algorithm":"sha256","hash":"%s"}' % hashlib.sha256(b"secret").hexdigest()
    assert verify_password("secret", portable, "portable")
    assert not verify_password("wrong", "not-a-valid-pbkdf2-record", "pbkdf2_sha256")
    assert not verify_password("secret", "scrypt$bad", "scrypt")


def test_login_me_refresh_rotation_and_logout() -> None:
    service = AuthService()
    seed_user(service)

    denied = client.post("/api/auth/login", json={"identifier": "ali", "password": "wrong"})
    assert denied.status_code == 401

    logged_in = client.post("/api/auth/login", json={"identifier": "ali", "password": "correct horse"})
    assert logged_in.status_code == 200
    first = logged_in.json()
    assert first["user"]["role"] == "admin"
    assert first["tokenType"] == "Bearer"

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {first['accessToken']}"})
    assert me.status_code == 200
    assert me.json()["id"] == "user-1"

    refreshed = client.post("/api/auth/refresh", json={"refreshToken": first["refreshToken"]})
    assert refreshed.status_code == 200
    second = refreshed.json()
    assert second["accessToken"] != first["accessToken"]
    assert second["refreshToken"] != first["refreshToken"]

    old_access = client.get("/api/auth/me", headers={"Authorization": f"Bearer {first['accessToken']}"})
    replay_refresh = client.post("/api/auth/refresh", json={"refreshToken": first["refreshToken"]})
    assert old_access.status_code == 401
    assert replay_refresh.status_code == 401

    assert client.post("/api/auth/logout", headers={"Authorization": f"Bearer {second['accessToken']}"}).status_code == 204
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {second['accessToken']}"}).status_code == 401
    # Logout is deliberately idempotent, including a repeated request.
    assert client.post("/api/auth/logout", headers={"Authorization": f"Bearer {second['accessToken']}"}).status_code == 204


def test_imported_opaque_token_and_jwt_signing_key() -> None:
    service = AuthService()
    seed_user(service, user_id="user-2")
    now = int(time.time())
    service.upsert_token(
        token_id="snapshot-access-1",
        user_id="user-2",
        kind="access",
        token_value="imported-opaque-token",
        issued_at=now,
        expires_at=now + 300,
    )
    assert service.authenticate_bearer("imported-opaque-token").id == "user-2"
    assert not service.revoke_access_token("unknown-token")

    secret = "test-signing-secret"
    service.upsert_signing_key(
        name="primary",
        key_id="key-1",
        value=secret,
        algorithm="HS256",
        issuer="genova-emergency",
        audience="genova-web",
    )
    token = jwt.encode(
        {"sub": "user-2", "type": "access", "iss": "genova-emergency", "aud": "genova-web", "exp": now + 300},
        secret,
        algorithm="HS256",
        headers={"kid": "key-1"},
    )
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "ali-user-2@example.test"


def test_expired_and_revoked_tokens_are_rejected() -> None:
    service = AuthService()
    seed_user(service, user_id="user-3")
    now = int(time.time())
    service.upsert_token(
        token_id="expired-access",
        user_id="user-3",
        kind="access",
        token_value="expired-token",
        issued_at=now - 20,
        expires_at=now - 1,
    )
    service.upsert_token(
        token_id="revoked-access",
        user_id="user-3",
        kind="access",
        token_value="revoked-token",
        issued_at=now,
        expires_at=now + 300,
        revoked_at=now,
    )
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer expired-token"}).status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer revoked-token"}).status_code == 401
