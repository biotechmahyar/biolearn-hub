"""Runtime configuration, bot, and payment services for the emergency backend."""
from __future__ import annotations

import json
import time
from typing import Any

from .db import connect


class RuntimeError(Exception):
    """Base error for expected runtime-domain failures."""


class RuntimeNotFound(RuntimeError):
    pass


class RuntimeValidationError(RuntimeError):
    pass


def _now() -> int:
    return int(time.time())


def _dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _load(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError, json.JSONDecodeError):
        return default


def _redact(value: Any, key: str = "") -> Any:
    lowered = key.lower()
    if any(word in lowered for word in ("secret", "token", "password", "private", "api_key", "apikey")):
        return "[REDACTED]"
    if isinstance(value, dict):
        return {item_key: _redact(item_value, str(item_key)) for item_key, item_value in value.items()}
    if isinstance(value, list):
        return [_redact(item) for item in value]
    return value


class RuntimeService:
    """Idempotent snapshot import and redacted runtime read APIs."""

    def upsert_runtime_setting(
        self,
        *,
        key: str,
        value: Any,
        is_secret: bool = False,
    ) -> None:
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_runtime_settings (key, value_json, is_secret, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value_json=excluded.value_json,
                    is_secret=excluded.is_secret,
                    updated_at=excluded.updated_at
                """,
                (key, _dump(value), int(is_secret), _now()),
            )

    def list_runtime_settings(self, *, include_secrets: bool = False) -> list[dict[str, Any]]:
        with connect() as connection:
            rows = connection.execute(
                "SELECT key, value_json, is_secret, updated_at FROM emergency_runtime_settings ORDER BY key"
            ).fetchall()
        result = []
        for row in rows:
            raw_value = _load(row["value_json"], None)
            result.append({
                "key": row["key"],
                "value": raw_value if include_secrets else ("[REDACTED]" if row["is_secret"] else _redact(raw_value)),
                "isSecret": bool(row["is_secret"]),
                "updatedAt": row["updated_at"],
            })
        return result

    def upsert_bot(
        self,
        *,
        bot_id: str,
        provider: str,
        name: str,
        status: str = "inactive",
        webhook_url: str | None = None,
        config: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_bots
                    (id, provider, name, status, webhook_url, config_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    provider=excluded.provider, name=excluded.name, status=excluded.status,
                    webhook_url=excluded.webhook_url, config_json=excluded.config_json,
                    updated_at=excluded.updated_at
                """,
                (bot_id, provider, name, status, webhook_url, _dump(config or {}), now, now),
            )

    def upsert_bot_command(
        self,
        *,
        command_id: str,
        bot_id: str,
        command: str,
        description: str | None = None,
        payload: dict[str, Any] | None = None,
        enabled: bool = True,
    ) -> None:
        with connect() as connection:
            self._require(connection, "emergency_bots", bot_id, "bot_not_found")
            connection.execute(
                """
                INSERT INTO emergency_bot_commands
                    (id, bot_id, command, description, payload_json, enabled)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    bot_id=excluded.bot_id, command=excluded.command,
                    description=excluded.description, payload_json=excluded.payload_json,
                    enabled=excluded.enabled
                """,
                (command_id, bot_id, command, description, _dump(payload or {}), int(enabled)),
            )

    def link_bot_user(
        self,
        *,
        link_id: str,
        bot_id: str,
        user_id: str,
        external_user_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        with connect() as connection:
            self._require(connection, "emergency_bots", bot_id, "bot_not_found")
            self._require(connection, "emergency_users", user_id, "user_not_found")
            connection.execute(
                """
                INSERT INTO emergency_bot_user_links
                    (id, bot_id, user_id, external_user_id, linked_at, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    bot_id=excluded.bot_id, user_id=excluded.user_id,
                    external_user_id=excluded.external_user_id,
                    metadata_json=excluded.metadata_json
                """,
                (link_id, bot_id, user_id, external_user_id, _now(), _dump(metadata or {})),
            )

    def list_bots(self, *, include_secrets: bool = False) -> list[dict[str, Any]]:
        with connect() as connection:
            rows = connection.execute("SELECT * FROM emergency_bots ORDER BY provider, name").fetchall()
            result = []
            for row in rows:
                commands = connection.execute(
                    "SELECT * FROM emergency_bot_commands WHERE bot_id = ? ORDER BY command",
                    (row["id"],),
                ).fetchall()
                result.append({
                    "id": row["id"], "provider": row["provider"], "name": row["name"],
                    "status": row["status"], "webhookUrl": row["webhook_url"],
                    "config": _load(row["config_json"], {}) if include_secrets else _redact(_load(row["config_json"], {})),
                    "commands": [self._command_row(command) for command in commands],
                    "createdAt": row["created_at"], "updatedAt": row["updated_at"],
                })
        return result

    def upsert_payment_gateway(
        self,
        *,
        gateway_id: str,
        provider: str,
        display_name: str,
        merchant_reference: str | None = None,
        status: str = "inactive",
        config: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_payment_gateways
                    (id, provider, display_name, merchant_reference, status,
                     config_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    provider=excluded.provider, display_name=excluded.display_name,
                    merchant_reference=excluded.merchant_reference, status=excluded.status,
                    config_json=excluded.config_json, updated_at=excluded.updated_at
                """,
                (gateway_id, provider, display_name, merchant_reference, status, _dump(config or {}), now, now),
            )

    def upsert_payment_transaction(
        self,
        *,
        transaction_id: str,
        gateway_id: str,
        status: str = "pending",
        user_id: str | None = None,
        provider_reference: str | None = None,
        order_reference: str | None = None,
        amount_minor: int = 0,
        currency: str = "IRR",
        paid_at: int | None = None,
        refunded_at: int | None = None,
        metadata: dict[str, Any] | None = None,
        history_id: str | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            self._require(connection, "emergency_payment_gateways", gateway_id, "gateway_not_found")
            if user_id:
                self._require(connection, "emergency_users", user_id, "user_not_found")
            previous = connection.execute(
                "SELECT status FROM emergency_payment_transactions WHERE id = ?",
                (transaction_id,),
            ).fetchone()
            connection.execute(
                """
                INSERT INTO emergency_payment_transactions
                    (id, gateway_id, user_id, provider_reference, order_reference,
                     amount_minor, currency, status, paid_at, refunded_at,
                     metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    gateway_id=excluded.gateway_id, user_id=excluded.user_id,
                    provider_reference=excluded.provider_reference,
                    order_reference=excluded.order_reference,
                    amount_minor=excluded.amount_minor, currency=excluded.currency,
                    status=excluded.status, paid_at=excluded.paid_at,
                    refunded_at=excluded.refunded_at, metadata_json=excluded.metadata_json,
                    updated_at=excluded.updated_at
                """,
                (transaction_id, gateway_id, user_id, provider_reference, order_reference,
                 amount_minor, currency, status, paid_at, refunded_at, _dump(metadata or {}), now, now),
            )
            if previous is None or previous["status"] != status:
                connection.execute(
                    """
                    INSERT INTO emergency_payment_status_history
                        (id, transaction_id, status, occurred_at, metadata_json)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET status=excluded.status,
                        occurred_at=excluded.occurred_at, metadata_json=excluded.metadata_json
                    """,
                    (history_id or f"{transaction_id}:{status}:{now}", transaction_id, status, now, _dump(metadata or {})),
                )

    def list_payment_gateways(self, *, include_secrets: bool = False) -> list[dict[str, Any]]:
        with connect() as connection:
            rows = connection.execute("SELECT * FROM emergency_payment_gateways ORDER BY provider, display_name").fetchall()
        return [
            {
                "id": row["id"], "provider": row["provider"], "displayName": row["display_name"],
                "merchantReference": row["merchant_reference"], "status": row["status"],
                "config": _load(row["config_json"], {}) if include_secrets else _redact(_load(row["config_json"], {})),
                "createdAt": row["created_at"], "updatedAt": row["updated_at"],
            }
            for row in rows
        ]

    def list_payment_transactions(
        self,
        *,
        user_id: str | None = None,
        gateway_id: str | None = None,
        status: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        conditions: list[str] = []
        params: list[Any] = []
        if user_id:
            conditions.append("user_id = ?")
            params.append(user_id)
        if gateway_id:
            conditions.append("gateway_id = ?")
            params.append(gateway_id)
        if status:
            conditions.append("status = ?")
            params.append(status)
        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(min(max(limit, 1), 500))
        with connect() as connection:
            rows = connection.execute(
                f"SELECT * FROM emergency_payment_transactions {where} ORDER BY created_at DESC LIMIT ?",
                params,
            ).fetchall()
        return [self._transaction_row(row) for row in rows]

    def get_payment_transaction(self, transaction_id: str) -> dict[str, Any]:
        with connect() as connection:
            row = connection.execute(
                "SELECT * FROM emergency_payment_transactions WHERE id = ?",
                (transaction_id,),
            ).fetchone()
            if row is None:
                raise RuntimeNotFound("transaction_not_found")
            history = connection.execute(
                "SELECT * FROM emergency_payment_status_history WHERE transaction_id = ? ORDER BY occurred_at",
                (transaction_id,),
            ).fetchall()
        result = self._transaction_row(row)
        result["statusHistory"] = [
            {"id": item["id"], "status": item["status"], "reason": item["reason"],
             "occurredAt": item["occurred_at"], "metadata": _load(item["metadata_json"], {})}
            for item in history
        ]
        return result

    @staticmethod
    def _require(connection: Any, table: str, record_id: str, error: str) -> None:
        if connection.execute(f"SELECT 1 FROM {table} WHERE id = ?", (record_id,)).fetchone() is None:
            raise RuntimeNotFound(error)

    @staticmethod
    def _command_row(row: Any) -> dict[str, Any]:
        return {
            "id": row["id"], "command": row["command"], "description": row["description"],
            "payload": _load(row["payload_json"], {}), "enabled": bool(row["enabled"]),
        }

    @staticmethod
    def _transaction_row(row: Any) -> dict[str, Any]:
        return {
            "id": row["id"], "gatewayId": row["gateway_id"], "userId": row["user_id"],
            "providerReference": row["provider_reference"], "orderReference": row["order_reference"],
            "amountMinor": row["amount_minor"], "currency": row["currency"], "status": row["status"],
            "paidAt": row["paid_at"], "refundedAt": row["refunded_at"],
            "metadata": _load(row["metadata_json"], {}), "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }
