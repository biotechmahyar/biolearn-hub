"""Small production security helpers with no external runtime dependency."""
from __future__ import annotations

import hashlib
import re
import threading
import time
from dataclasses import dataclass, field

from .config import settings


_REQUEST_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


def safe_request_id(value: str | None) -> str | None:
    if value and _REQUEST_ID.fullmatch(value):
        return value
    return None


@dataclass
class _AttemptState:
    failures: list[float] = field(default_factory=list)
    blocked_until: float = 0.0


class LoginRateLimiter:
    """Bounded in-memory limiter; deployment guidance uses one Uvicorn worker."""

    def __init__(self) -> None:
        self._states: dict[str, _AttemptState] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _key(identifier: str, client_host: str | None) -> str:
        value = f"{identifier.strip().lower()}|{client_host or 'unknown'}"
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def check(self, identifier: str, client_host: str | None) -> tuple[bool, int]:
        key = self._key(identifier, client_host)
        now = time.time()
        with self._lock:
            state = self._states.get(key)
            if state is None:
                return True, 0
            if state.blocked_until > now:
                return False, max(1, int(state.blocked_until - now))
            state.failures = [
                value for value in state.failures
                if value > now - settings.auth_rate_limit_window_seconds
            ]
            if not state.failures:
                self._states.pop(key, None)
            return True, 0

    def record_failure(self, identifier: str, client_host: str | None) -> int:
        key = self._key(identifier, client_host)
        now = time.time()
        with self._lock:
            if len(self._states) >= 10_000 and key not in self._states:
                for existing_key, existing in list(self._states.items()):
                    if existing.blocked_until <= now and not existing.failures:
                        self._states.pop(existing_key, None)
                if len(self._states) >= 10_000:
                    oldest = min(
                        self._states,
                        key=lambda item: max(self._states[item].blocked_until, *self._states[item].failures[-1:]),
                    )
                    self._states.pop(oldest, None)
            state = self._states.setdefault(key, _AttemptState())
            state.failures = [
                value for value in state.failures
                if value > now - settings.auth_rate_limit_window_seconds
            ]
            state.failures.append(now)
            if len(state.failures) >= max(1, settings.auth_rate_limit_attempts):
                state.blocked_until = now + max(1, settings.auth_rate_limit_block_seconds)
                return max(1, int(state.blocked_until - now))
            remaining = max(1, settings.auth_rate_limit_attempts - len(state.failures))
            window = max(1, settings.auth_rate_limit_window_seconds)
            return max(1, int(state.failures[0] + window - now))

    def reset(self, identifier: str, client_host: str | None) -> None:
        with self._lock:
            self._states.pop(self._key(identifier, client_host), None)
