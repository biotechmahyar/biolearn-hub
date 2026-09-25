"""Phase-nine data completion and one-time main-site migration.

The importer consumes a JSON export produced outside this service. It never
imports or calls the primary Vite/Convex runtime. Source IDs and timestamps are
preserved whenever they can be mapped directly; an explicit ID map handles
systems that assigned different emergency IDs.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import sqlite3
import time
from typing import Any, Iterable, Mapping
from urllib.parse import urlparse

from .completion_tables import COMPLETION_SECTION_SPECS
from .config import settings
from .db import connect
from .operations_service import BackupService


MAX_MAIN_EXPORT_BYTES = 250 * 1024 * 1024
_SAFE_FILENAME = re.compile(r"[^A-Za-z0-9._-]+")
_TABLES_WITH_ID = {spec.table for specs in COMPLETION_SECTION_SPECS.values() for spec in specs}


class MainSiteMigrationError(Exception):
    pass


class MainSiteMigrationValidationError(MainSiteMigrationError):
    def __init__(self, diagnostics: list[dict[str, Any]]):
        self.diagnostics = diagnostics
        super().__init__("main_site_migration_validation_failed")


def _now() -> int:
    return int(time.time())


def _json_dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _source_id(row: Mapping[str, Any]) -> str:
    value = row.get("_id", row.get("id"))
    if value is None:
        raise MainSiteMigrationError("source_record_missing_id")
    return str(value)


def _timestamp(value: Any, default: int | None = None) -> int:
    if isinstance(value, (int, float)):
        numeric = float(value)
        if numeric > 10_000_000_000:
            return int(numeric / 1000)
        return int(numeric)
    if isinstance(value, str):
        try:
            from datetime import datetime

            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return int(parsed.timestamp())
        except ValueError:
            pass
    return default if default is not None else _now()


def _integer(value: Any, default: int = 0) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return default


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return default


def _safe_name(value: str, fallback: str = "file") -> str:
    name = Path(urlparse(value).path).name if "://" in value else Path(value).name
    normalized = _SAFE_FILENAME.sub("-", name).strip("-._")
    return (normalized or fallback)[:180]


def _table_rows(tables: Mapping[str, Any], *names: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    for name in names:
        value = tables.get(name, [])
        if not isinstance(value, list):
            continue
        for row in value:
            if not isinstance(row, dict):
                continue
            try:
                source_id = _source_id(row)
            except MainSiteMigrationError:
                continue
            if source_id in seen:
                continue
            seen.add(source_id)
            rows.append(row)
    return rows


class FileTransferService:
    """Copy one-time source payloads into a content-addressed private store."""

    def __init__(self, file_root: str | Path | None = None) -> None:
        self.file_root = Path(file_root or settings.file_root).expanduser().resolve()

    def build_manifest(
        self,
        *,
        source_ref: str,
        name: str,
        mime_type: str | None = None,
        size_bytes: int | None = None,
        source_table: str,
        source_field: str,
        created_at: int,
        is_sensitive: bool,
        files_directory: Path | None,
        install: bool,
    ) -> dict[str, Any]:
        reference = str(source_ref or "").strip()
        safe_name = _safe_name(name or reference)
        payload = self._find_payload(reference, files_directory)
        diagnostics: dict[str, Any] = {}
        if payload is None:
            record_id = f"file-ref:{hashlib.sha256(reference.encode('utf-8')).hexdigest()[:32]}"
            if reference:
                diagnostics = {"code": "file_payload_missing", "reference": reference[:240]}
            return {
                "id": record_id,
                "source_system": "genova-main",
                "storage_id": reference or None,
                "name": safe_name,
                "mime_type": mime_type,
                "size_bytes": max(0, _integer(size_bytes)),
                "sha256": None,
                "original_ref": reference or None,
                "local_path": None,
                "status": "missing",
                "is_sensitive": bool(is_sensitive),
                "metadata_json": _json_dump({
                    "sourceTable": source_table,
                    "sourceField": source_field,
                    **diagnostics,
                }),
                "created_at": created_at,
                "updated_at": created_at,
            }

        if not payload.is_file() or payload.is_symlink():
            raise MainSiteMigrationError("unsafe_file_payload")
        actual_size = payload.stat().st_size
        if actual_size > max(1, settings.max_file_bytes):
            raise MainSiteMigrationError("file_payload_too_large")
        digest = hashlib.sha256()
        with payload.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        sha256 = digest.hexdigest()
        record_id = f"file:{sha256}"
        relative = f"{sha256[:2]}/{sha256}"
        if install:
            destination = self.file_root / relative
            destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            if destination.exists():
                if not destination.is_file() or destination.stat().st_size != actual_size or self._sha256_file(destination) != sha256:
                    raise MainSiteMigrationError("file_store_hash_collision")
            else:
                staging = destination.parent / f".building-{secrets.token_hex(8)}"
                try:
                    descriptor = os.open(staging, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                    with os.fdopen(descriptor, "wb") as target, payload.open("rb") as source:
                        shutil.copyfileobj(source, target, length=1024 * 1024)
                        target.flush()
                        os.fsync(target.fileno())
                    os.replace(staging, destination)
                finally:
                    staging.unlink(missing_ok=True)
        return {
            "id": record_id,
            "source_system": "genova-main",
            "storage_id": reference or None,
            "name": safe_name,
            "mime_type": mime_type,
            "size_bytes": actual_size,
            "sha256": sha256,
            "original_ref": reference or None,
            "local_path": relative if install else None,
            "status": "available" if install else "validated",
            "is_sensitive": bool(is_sensitive),
            "metadata_json": _json_dump({
                "sourceTable": source_table,
                "sourceField": source_field,
                "sourceSize": _integer(size_bytes),
            }),
            "created_at": created_at,
            "updated_at": created_at,
        }

    @staticmethod
    def _sha256_file(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()

    @staticmethod
    def _find_payload(reference: str, files_directory: Path | None) -> Path | None:
        if not reference or files_directory is None:
            return None
        root = files_directory.expanduser().resolve()
        if not root.is_dir():
            return None
        candidates = [
            root / _safe_name(reference, "payload"),
            root / hashlib.sha256(reference.encode("utf-8")).hexdigest(),
        ]
        if "://" not in reference:
            direct = Path(reference)
            if not direct.is_absolute() and len(direct.parts) == 1:
                candidates.append(root / direct.name)
        for candidate in candidates:
            if candidate.is_symlink():
                continue
            try:
                resolved = candidate.resolve()
            except OSError:
                continue
            if resolved.parent != root or not resolved.is_file() or resolved.is_symlink():
                continue
            return resolved
        return None


class CommerceService:
    def list_products(self, *, limit: int = 100) -> list[dict[str, Any]]:
        with connect() as connection:
            rows = connection.execute(
                "SELECT * FROM emergency_commerce_products ORDER BY updated_at DESC LIMIT ?",
                (min(max(limit, 1), 500),),
            ).fetchall()
        result = []
        for row in rows:
            value = dict(row)
            value["metadata"] = json.loads(value.pop("metadata_json") or "{}")
            result.append(value)
        return result

    def list_orders(self, *, user_id: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        with connect() as connection:
            if user_id:
                rows = connection.execute(
                    "SELECT * FROM emergency_commerce_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                    (user_id, min(max(limit, 1), 500)),
                ).fetchall()
            else:
                rows = connection.execute(
                    "SELECT * FROM emergency_commerce_orders ORDER BY created_at DESC LIMIT ?",
                    (min(max(limit, 1), 500),),
                ).fetchall()
        result = []
        for row in rows:
            value = dict(row)
            value["items"] = json.loads(value.pop("items_json") or "[]")
            value["metadata"] = json.loads(value.pop("metadata_json") or "{}")
            result.append(value)
        return result

    def summary(self) -> dict[str, int]:
        tables = [
            "emergency_commerce_products",
            "emergency_commerce_orders",
            "emergency_commerce_marketplace_orders",
            "emergency_commerce_payment_records",
        ]
        with connect() as connection:
            return {table: int(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]) for table in tables}


class CommunicationService:
    def list_notifications(self, *, user_id: str, limit: int = 100) -> list[dict[str, Any]]:
        with connect() as connection:
            rows = connection.execute(
                "SELECT * FROM emergency_communication_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                (user_id, min(max(limit, 1), 500)),
            ).fetchall()
        result = []
        for row in rows:
            value = dict(row)
            value["isRead"] = bool(value.pop("is_read"))
            value["metadata"] = json.loads(value.pop("metadata_json") or "{}")
            result.append(value)
        return result

    def summary(self) -> dict[str, int]:
        tables = [
            "emergency_communication_notifications",
            "emergency_communication_inbox_messages",
            "emergency_communication_support_tickets",
            "emergency_communication_support_messages",
            "emergency_communication_direct_messages",
        ]
        with connect() as connection:
            return {table: int(connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]) for table in tables}


class FileManifestService:
    def list_files(self, *, limit: int = 200) -> list[dict[str, Any]]:
        with connect() as connection:
            rows = connection.execute(
                "SELECT * FROM emergency_file_manifest ORDER BY updated_at DESC LIMIT ?",
                (min(max(limit, 1), 1000),),
            ).fetchall()
        result = []
        for row in rows:
            value = dict(row)
            original_ref = value.get("original_ref")
            if original_ref and "://" in str(original_ref):
                parsed = urlparse(str(original_ref))
                value["original_ref"] = parsed._replace(query="", fragment="").geturl()
            value["is_sensitive"] = bool(value.get("is_sensitive"))
            value["metadata"] = json.loads(value.pop("metadata_json") or "{}")
            result.append(value)
        return result


class MainSiteMigrationService:
    """Validate and idempotently merge one main-site JSON export."""

    def __init__(
        self,
        *,
        id_map: Mapping[str, str] | None = None,
        files_directory: str | Path | None = None,
        file_service: FileTransferService | None = None,
        backup_service: BackupService | None = None,
    ) -> None:
        self.id_map = dict(id_map or {})
        self.files_directory = Path(files_directory).expanduser().resolve() if files_directory else None
        self.file_service = file_service or FileTransferService()
        self.backup_service = backup_service or BackupService()

    def _ref(self, kind: str, value: Any) -> str | None:
        if value is None or value == "":
            return None
        source = str(value)
        return self.id_map.get(f"{kind}:{source}", source)

    def load_export(self, path: str | Path) -> tuple[dict[str, Any], str, str | None]:
        source_path = Path(path).expanduser().resolve()
        if source_path.is_symlink() or not source_path.is_file():
            raise MainSiteMigrationError("main_export_not_found")
        if source_path.stat().st_size > MAX_MAIN_EXPORT_BYTES:
            raise MainSiteMigrationError("main_export_too_large")
        content = source_path.read_bytes()
        try:
            payload = json.loads(content)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise MainSiteMigrationError("main_export_invalid_json") from error
        if not isinstance(payload, dict):
            raise MainSiteMigrationError("main_export_root_must_be_object")
        tables = payload.get("tables", payload)
        if not isinstance(tables, dict) or not any(isinstance(value, list) for value in tables.values()):
            raise MainSiteMigrationError("main_export_tables_missing")
        return tables, hashlib.sha256(content).hexdigest(), payload.get("exportedAt")

    def build_sections(
        self,
        tables: Mapping[str, Any],
        *,
        install_files: bool,
        public_media: bool = False,
    ) -> tuple[dict[str, dict[str, list[dict[str, Any]]]], list[dict[str, Any]], dict[str, dict[str, Any]]]:
        diagnostics: list[dict[str, Any]] = []
        files_by_ref: dict[str, dict[str, Any]] = {}
        commerce: dict[str, list[dict[str, Any]]] = {spec.table: [] for spec in COMPLETION_SECTION_SPECS["commerce"]}
        communication: dict[str, list[dict[str, Any]]] = {spec.table: [] for spec in COMPLETION_SECTION_SPECS["communication"]}
        files: dict[str, list[dict[str, Any]]] = {"emergency_file_manifest": []}

        def add_file(reference: Any, name: str, mime: str | None, size: Any, table: str, field: str, timestamp: int, sensitive: bool = True) -> None:
            key = str(reference or "").strip()
            if not key or key in files_by_ref:
                return
            manifest = self.file_service.build_manifest(
                source_ref=key,
                name=name,
                mime_type=mime,
                size_bytes=_integer(size),
                source_table=table,
                source_field=field,
                created_at=timestamp,
                is_sensitive=sensitive,
                files_directory=self.files_directory,
                install=install_files,
            )
            files_by_ref[key] = manifest
            files["emergency_file_manifest"].append(manifest)
            if manifest["status"] == "missing":
                diagnostics.append({
                    "severity": "warning",
                    "code": "file_payload_missing",
                    "sourceTable": table,
                    "sourceField": field,
                    "reference": key[:200],
                })

        for row in _table_rows(tables, "mediaItems"):
            timestamp = _timestamp(row.get("createdAt"))
            ref = row.get("url") or row.get("storageId") or row.get("_id")
            add_file(ref, str(row.get("name") or ""), row.get("mimeType"), row.get("size"), "mediaItems", "url", timestamp, sensitive=not public_media)
        for row in _table_rows(tables, "storeProducts", "products"):
            timestamp = _timestamp(row.get("createdAt"))
            for ref in row.get("images", []) if isinstance(row.get("images"), list) else []:
                add_file(ref, str(row.get("title") or ""), None, None, "storeProducts", "images", timestamp)
            if row.get("coverImage"):
                add_file(row["coverImage"], str(row.get("title") or ""), None, None, "storeProducts", "coverImage", timestamp)
        for table_name in ("courseResources",):
            for row in _table_rows(tables, table_name):
                timestamp = _timestamp(row.get("createdAt"))
                if row.get("fileUrl"):
                    add_file(row["fileUrl"], str(row.get("fileName") or ""), row.get("fileType"), row.get("fileSize"), table_name, "fileUrl", timestamp)
        for table_name in ("lessonContent", "courseLessons"):
            for row in _table_rows(tables, table_name):
                timestamp = _timestamp(row.get("createdAt", row.get("updatedAt")))
                if row.get("videoStorageId"):
                    add_file(row["videoStorageId"], f"{table_name}-video", None, None, table_name, "videoStorageId", timestamp)
                attachments = row.get("attachments", [])
                if isinstance(attachments, list):
                    for item in attachments:
                        if isinstance(item, dict):
                            add_file(item.get("url") or item.get("storageId"), str(item.get("name") or ""), item.get("type"), item.get("size"), table_name, "attachments", timestamp)
        for row in _table_rows(tables, "supportMessages"):
            if row.get("attachmentStorageId"):
                add_file(row["attachmentStorageId"], str(row.get("attachmentName") or ""), None, row.get("attachmentSize"), "supportMessages", "attachmentStorageId", _timestamp(row.get("createdAt")))
        for row in _table_rows(tables, "roomMessages"):
            if row.get("attachmentStorageId"):
                add_file(row["attachmentStorageId"], str(row.get("attachmentName") or ""), row.get("attachmentType"), row.get("attachmentSize"), "roomMessages", "attachmentStorageId", _timestamp(row.get("createdAt")))

        now = _now()
        products = _table_rows(tables, "storeProducts", "products")
        for row in products:
            created = _timestamp(row.get("createdAt"), now)
            seller = self._ref("users", row.get("sellerId", row.get("userId")))
            if seller is None:
                diagnostics.append({"severity": "error", "code": "product_seller_missing", "record": _source_id(row)})
                continue
            commerce["emergency_commerce_products"].append({
                "id": _source_id(row), "seller_id": seller,
                "title": str(row.get("title") or "Untitled"), "slug": str(row.get("slug") or _source_id(row)),
                "description": row.get("description"), "category": row.get("category"),
                "condition": row.get("condition"), "price_minor": _integer(row.get("price")),
                "currency": "IRR", "stock": _integer(row.get("stock")), "sold_count": _integer(row.get("soldCount")),
                "rating": _number(row.get("rating")), "rating_count": _integer(row.get("ratingCount")),
                "status": str(row.get("status", "draft")),
                "metadata_json": _json_dump({"sourceUnit": "toman", "coverImage": row.get("coverImage")}),
                "created_at": created, "updated_at": _timestamp(row.get("updatedAt"), created),
            })

        for row in _table_rows(tables, "coupons", "storeCoupons"):
            created = _timestamp(row.get("createdAt"), now)
            commerce["emergency_commerce_coupons"].append({
                "id": _source_id(row), "code": str(row.get("code") or _source_id(row)),
                "discount_percent": _number(row.get("percent")), "max_uses": _integer(row.get("maxUses")),
                "used_count": _integer(row.get("usedCount")), "minimum_amount_minor": _integer(row.get("minPurchase")),
                "maximum_discount_minor": _integer(row.get("maxDiscount")), "active": bool(row.get("active", True)),
                "expires_at": _timestamp(row["expiresAt"]) if row.get("expiresAt") is not None else None,
                "constraints_json": _json_dump({"source": "main"}), "created_at": created, "updated_at": created,
            })

        for row in _table_rows(tables, "orders"):
            user_id = self._ref("users", row.get("userId"))
            if user_id is None:
                diagnostics.append({"severity": "error", "code": "order_user_missing", "record": _source_id(row)})
                continue
            created = _timestamp(row.get("createdAt"), now)
            commerce["emergency_commerce_orders"].append({
                "id": _source_id(row), "user_id": user_id,
                "items_json": _json_dump(row.get("items", [])), "subtotal_minor": _integer(row.get("subtotal")),
                "discount_amount_minor": _integer(row.get("discountAmount")), "total_minor": _integer(row.get("total")),
                "coupon_code": row.get("couponCode"), "status": str(row.get("status", "pending")),
                "payment_method": row.get("payMethod"), "invoice_number": row.get("invoiceNumber"),
                "metadata_json": _json_dump({"sourceUnit": "toman"}),
                "created_at": created, "updated_at": created,
            })

        for row in _table_rows(tables, "storeOrders"):
            buyer = self._ref("users", row.get("buyerId"))
            seller = self._ref("users", row.get("sellerId"))
            product = self._ref("commerce_products", row.get("productId"))
            if not buyer or not seller or not product:
                diagnostics.append({"severity": "error", "code": "marketplace_order_reference_missing", "record": _source_id(row)})
                continue
            created = _timestamp(row.get("createdAt"), now)
            commerce["emergency_commerce_marketplace_orders"].append({
                "id": _source_id(row), "buyer_id": buyer, "seller_id": seller, "product_id": product,
                "quantity": max(1, _integer(row.get("quantity"), 1)),
                "unit_price_minor": _integer(row.get("unitPrice")), "commission_minor": _integer(row.get("commission")),
                "total_minor": _integer(row.get("total")), "seller_earning_minor": _integer(row.get("sellerEarning")),
                "status": str(row.get("status", "pending")),
                "delivery_json": _json_dump({"city": row.get("deliveryCity"), "address": row.get("deliveryAddress"), "note": row.get("deliveryNote")}),
                "payment_json": _json_dump({"paidWithWallet": row.get("paidWithWallet"), "method": row.get("payMethod")}),
                "invoice_number": row.get("invoiceNumber"), "created_at": created,
                "updated_at": _timestamp(row.get("updatedAt"), created),
            })

        for row in _table_rows(tables, "storeReviews"):
            user_id = self._ref("users", row.get("userId"))
            product_id = self._ref("commerce_products", row.get("productId"))
            if not user_id or not product_id:
                continue
            created = _timestamp(row.get("createdAt"), now)
            commerce["emergency_commerce_reviews"].append({
                "id": _source_id(row), "product_id": product_id, "user_id": user_id,
                "rating": _number(row.get("rating")), "body": row.get("text"),
                "created_at": created, "updated_at": created,
            })

        for row in _table_rows(tables, "wallet", "wallets"):
            user_id = self._ref("users", row.get("userId"))
            if not user_id:
                continue
            commerce["emergency_commerce_wallets"].append({
                "id": _source_id(row), "user_id": user_id,
                "balance_minor": _integer(row.get("balance")), "frozen_balance_minor": _integer(row.get("frozenBalance")),
                "total_earned_minor": _integer(row.get("totalEarned")), "total_spent_minor": _integer(row.get("totalSpent")),
                "updated_at": _timestamp(row.get("updatedAt"), now),
            })
        for row in _table_rows(tables, "walletTransactions"):
            user_id = self._ref("users", row.get("userId"))
            if not user_id:
                continue
            commerce["emergency_commerce_wallet_transactions"].append({
                "id": _source_id(row), "user_id": user_id, "kind": str(row.get("type", "unknown")),
                "amount_minor": _integer(row.get("amount")), "body": row.get("description"),
                "related_order_id": row.get("relatedOrderId"),
                "related_product_id": self._ref("commerce_products", row.get("relatedProductId")),
                "metadata_json": _json_dump({"sourceUnit": "toman"}),
                "created_at": _timestamp(row.get("createdAt"), now),
            })

        for table_name, kind in (("payments", "payment"), ("offlinePayments", "offline_payment"), ("instructorPayments", "instructor_payment")):
            for row in _table_rows(tables, table_name):
                user_id = self._ref("users", row.get("userId", row.get("instructorId")))
                created = _timestamp(row.get("createdAt"), now)
                commerce["emergency_commerce_payment_records"].append({
                    "id": f"{kind}:{_source_id(row)}", "user_id": user_id, "kind": kind,
                    "amount_minor": _integer(row.get("amount", row.get("total"))), "currency": "IRR",
                    "status": str(row.get("status", "pending")), "provider_reference": row.get("trackingNumber"),
                    "paid_at": _timestamp(row["paidAt"]) if row.get("paidAt") is not None else None,
                    "metadata_json": _json_dump({"sourceTable": table_name, "sourceUnit": "toman"}),
                    "created_at": created, "updated_at": created,
                })
        for row in _table_rows(tables, "aiSubscriptions"):
            user_id = self._ref("users", row.get("userId"))
            if not user_id:
                continue
            commerce["emergency_commerce_subscriptions"].append({
                "id": _source_id(row), "user_id": user_id, "tier": str(row.get("tier", "bronze")),
                "daily_limit": _integer(row.get("dailyLimit")), "order_reference": row.get("orderId"),
                "active": bool(row.get("active", True)), "started_at": _timestamp(row.get("startedAt"), now),
                "expires_at": _timestamp(row.get("expiresAt"), now), "metadata_json": _json_dump({"source": "main"}),
            })

        for row in _table_rows(tables, "notifications"):
            user_id = self._ref("users", row.get("userId"))
            if not user_id:
                continue
            created = _timestamp(row.get("createdAt"), now)
            communication["emergency_communication_notifications"].append({
                "id": _source_id(row), "user_id": user_id, "kind": str(row.get("type", "generic")),
                "title": str(row.get("title", "")), "body": str(row.get("body", "")),
                "entity_type": row.get("entityType"), "entity_id": row.get("entityId"),
                "is_read": bool(row.get("isRead", False)),
                "read_at": _timestamp(row["readAt"]) if row.get("readAt") is not None else None,
                "metadata_json": _json_dump({"source": "main"}), "created_at": created,
            })
        for table_name in ("announcements", "siteAnnouncements"):
            for row in _table_rows(tables, table_name):
                created = _timestamp(row.get("createdAt", row.get("publishedAt")), now)
                communication["emergency_communication_announcements"].append({
                    "id": _source_id(row), "author_id": self._ref("users", row.get("authorId")),
                    "author_name": row.get("authorName"), "author_role": row.get("authorRole"),
                    "target_type": str(row.get("targetType", "all")), "target_id": row.get("targetId"),
                    "target_title": row.get("targetTitle"), "title": str(row.get("title", "")),
                    "body": str(row.get("body", row.get("message", ""))),
                    "metadata_json": _json_dump({"sourceTable": table_name}), "created_at": created,
                })
        for row in _table_rows(tables, "inboxMessages"):
            user_id = self._ref("users", row.get("userId"))
            if not user_id:
                continue
            created = _timestamp(row.get("createdAt"), now)
            communication["emergency_communication_inbox_messages"].append({
                "id": _source_id(row), "user_id": user_id, "title": str(row.get("title", "")),
                "body": str(row.get("body", "")), "is_read": row.get("readAt") is not None,
                "read_at": _timestamp(row["readAt"]) if row.get("readAt") is not None else None,
                "metadata_json": _json_dump({"source": "main"}), "created_at": created,
            })

        ticket_rows = _table_rows(tables, "supportTickets")
        for row in ticket_rows:
            student = self._ref("users", row.get("studentId", row.get("userId")))
            teacher = self._ref("users", row.get("teacherId"))
            course = self._ref("courses", row.get("courseId"))
            if not student or not teacher:
                diagnostics.append({"severity": "error", "code": "support_ticket_user_missing", "record": _source_id(row)})
                continue
            created = _timestamp(row.get("createdAt"), now)
            communication["emergency_communication_support_tickets"].append({
                "id": _source_id(row), "student_id": student, "student_name": row.get("studentName"),
                "teacher_id": teacher, "course_id": course, "course_name": row.get("courseName"),
                "subject": str(row.get("subject", "")), "status": str(row.get("status", "open")),
                "unread_by_student": _integer(row.get("unreadByStudent")),
                "unread_by_teacher": _integer(row.get("unreadByTeacher")),
                "last_message_at": _timestamp(row.get("lastMessageAt"), created),
                "metadata_json": _json_dump({"source": "main"}), "created_at": created,
                "updated_at": _timestamp(row.get("updatedAt"), created),
            })
            embedded = row.get("messages", [])
            if isinstance(embedded, list):
                for index, message in enumerate(embedded):
                    if not isinstance(message, dict):
                        continue
                    message_id = f"ticket-message:{_source_id(row)}:{index}"
                    communication["emergency_communication_support_messages"].append({
                        "id": message_id, "ticket_id": _source_id(row), "sender_id": teacher,
                        "sender_name": message.get("author"), "sender_role": "admin",
                        "body": str(message.get("text", "")), "attachment_file_id": None,
                        "read_at": None, "metadata_json": _json_dump({"embedded": True}),
                        "created_at": _timestamp(message.get("at"), created),
                    })
        ticket_by_source = {_source_id(row): _source_id(row) for row in ticket_rows}
        for row in _table_rows(tables, "supportMessages"):
            ticket = ticket_by_source.get(str(row.get("ticketId")))
            sender = self._ref("users", row.get("senderId"))
            if not ticket or not sender:
                continue
            ref = row.get("attachmentStorageId")
            file_record = files_by_ref.get(str(ref or ""))
            communication["emergency_communication_support_messages"].append({
                "id": _source_id(row), "ticket_id": ticket, "sender_id": sender,
                "sender_name": row.get("senderName"), "sender_role": row.get("senderRole"),
                "body": str(row.get("message", "")), "attachment_file_id": file_record.get("id") if file_record else None,
                "read_at": _timestamp(row["readAt"]) if row.get("readAt") is not None else None,
                "metadata_json": _json_dump({"source": "main"}), "created_at": _timestamp(row.get("createdAt"), now),
            })
        for table_name in ("directMessages", "storeMessages"):
            for row in _table_rows(tables, table_name):
                sender = self._ref("users", row.get("senderId"))
                receiver = self._ref("users", row.get("receiverId"))
                if not sender or not receiver:
                    continue
                communication["emergency_communication_direct_messages"].append({
                    "id": _source_id(row), "sender_id": sender, "receiver_id": receiver,
                    "body": str(row.get("text", "")), "is_read": bool(row.get("read", False)),
                    "read_at": None, "metadata_json": _json_dump({"sourceTable": table_name}),
                    "created_at": _timestamp(row.get("createdAt"), now),
                })

        group_rows = _table_rows(tables, "mentorGroups")
        for row in group_rows:
            mentor = self._ref("users", row.get("mentorId"))
            if not mentor:
                continue
            created = _timestamp(row.get("createdAt"), now)
            communication["emergency_communication_mentor_groups"].append({
                "id": _source_id(row), "mentor_id": mentor, "mentor_name": row.get("mentorName"),
                "title": str(row.get("title", "")), "description": row.get("description"),
                "meeting_day": row.get("meetingDay"), "meeting_time": row.get("meetingTime"),
                "capacity": _integer(row.get("capacity")), "member_count": _integer(row.get("memberCount")),
                "created_at": created, "updated_at": created,
            })
        for row in _table_rows(tables, "groupMembers"):
            group = self._ref("communication_mentor_groups", row.get("groupId"))
            user = self._ref("users", row.get("userId"))
            if not group or not user:
                continue
            communication["emergency_communication_mentor_group_members"].append({
                "id": _source_id(row), "group_id": group, "user_id": user,
                "user_name": row.get("userName"), "joined_at": _timestamp(row.get("joinedAt"), now),
            })
        for row in _table_rows(tables, "mentorQuestions"):
            student = self._ref("users", row.get("studentId"))
            if not student:
                continue
            communication["emergency_communication_mentor_questions"].append({
                "id": _source_id(row), "student_id": student, "student_name": row.get("studentName"),
                "topic": str(row.get("topic", "")), "body": str(row.get("text", "")),
                "status": str(row.get("status", "open")), "answer": row.get("answer"),
                "answered_by_name": row.get("answeredByName"),
                "answered_at": _timestamp(row["answeredAt"]) if row.get("answeredAt") is not None else None,
                "created_at": _timestamp(row.get("createdAt"), now),
            })
        for row in _table_rows(tables, "mentorSessions"):
            mentor = self._ref("users", row.get("mentorId"))
            student = self._ref("users", row.get("studentId"))
            if not mentor or not student:
                continue
            communication["emergency_communication_mentor_sessions"].append({
                "id": _source_id(row), "mentor_id": mentor, "mentor_name": row.get("mentorName"),
                "student_id": student, "title": str(row.get("title", "")),
                "session_date": row.get("date"), "session_time": row.get("time"), "notes": row.get("notes"),
                "status": str(row.get("status", "scheduled")), "created_at": _timestamp(row.get("createdAt"), now),
            })
        for row in _table_rows(tables, "comments"):
            user = self._ref("users", row.get("userId"))
            if not user:
                continue
            created = _timestamp(row.get("createdAt"), now)
            communication["emergency_communication_comments"].append({
                "id": _source_id(row), "content_type": str(row.get("contentType", "unknown")),
                "content_id": str(row.get("contentId", "")), "user_id": user,
                "user_name": row.get("userName"), "body": str(row.get("text", "")),
                "approved": bool(row.get("approved", False)), "rejected": bool(row.get("rejected", False)),
                "created_at": created, "updated_at": created,
            })

        sections = {"commerce": commerce, "communication": communication, "files": files}
        self._validate_relationships(sections, diagnostics)
        return sections, diagnostics, files_by_ref

    def _validate_relationships(self, sections: Mapping[str, Any], diagnostics: list[dict[str, Any]]) -> None:
        relations = [
            ("emergency_commerce_products", "seller_id", "emergency_users", "id"),
            ("emergency_commerce_orders", "user_id", "emergency_users", "id"),
            ("emergency_commerce_marketplace_orders", "buyer_id", "emergency_users", "id"),
            ("emergency_commerce_marketplace_orders", "seller_id", "emergency_users", "id"),
            ("emergency_commerce_marketplace_orders", "product_id", "emergency_commerce_products", "id"),
            ("emergency_commerce_reviews", "product_id", "emergency_commerce_products", "id"),
            ("emergency_commerce_reviews", "user_id", "emergency_users", "id"),
            ("emergency_commerce_wallets", "user_id", "emergency_users", "id"),
            ("emergency_commerce_wallet_transactions", "user_id", "emergency_users", "id"),
            ("emergency_commerce_payment_records", "user_id", "emergency_users", "id"),
            ("emergency_commerce_subscriptions", "user_id", "emergency_users", "id"),
            ("emergency_communication_notifications", "user_id", "emergency_users", "id"),
            ("emergency_communication_announcements", "author_id", "emergency_users", "id"),
            ("emergency_communication_inbox_messages", "user_id", "emergency_users", "id"),
            ("emergency_communication_support_tickets", "student_id", "emergency_users", "id"),
            ("emergency_communication_support_tickets", "teacher_id", "emergency_users", "id"),
            ("emergency_communication_support_tickets", "course_id", "emergency_courses", "id"),
            ("emergency_communication_support_messages", "ticket_id", "emergency_communication_support_tickets", "id"),
            ("emergency_communication_support_messages", "sender_id", "emergency_users", "id"),
            ("emergency_communication_direct_messages", "sender_id", "emergency_users", "id"),
            ("emergency_communication_direct_messages", "receiver_id", "emergency_users", "id"),
            ("emergency_communication_mentor_groups", "mentor_id", "emergency_users", "id"),
            ("emergency_communication_mentor_group_members", "group_id", "emergency_communication_mentor_groups", "id"),
            ("emergency_communication_mentor_group_members", "user_id", "emergency_users", "id"),
            ("emergency_communication_mentor_questions", "student_id", "emergency_users", "id"),
            ("emergency_communication_mentor_sessions", "mentor_id", "emergency_users", "id"),
            ("emergency_communication_mentor_sessions", "student_id", "emergency_users", "id"),
            ("emergency_communication_comments", "user_id", "emergency_users", "id"),
        ]
        records_by_table = {
            table: records
            for group in sections.values()
            for table, records in group.items()
            if isinstance(records, list)
        }
        with connect() as connection:
            available: dict[str, set[str]] = {}
            for table in {parent for _, _, parent, _ in relations}:
                available[table] = {
                    str(row[0]) for row in connection.execute(f"SELECT id FROM {table}")
                } | {str(record.get("id")) for record in records_by_table.get(table, [])}
        for child, column, parent, _ in relations:
            for index, record in enumerate(records_by_table.get(child, [])):
                reference = record.get(column)
                if reference is not None and str(reference) not in available.get(parent, set()):
                    diagnostics.append({
                        "severity": "error",
                        "code": "missing_relationship",
                        "table": child,
                        "field": column,
                        "record": record.get("id", index),
                        "parentTable": parent,
                    })

    def status(self) -> dict[str, Any]:
        with connect() as connection:
            runs = connection.execute(
                """
                SELECT id, source_hash, source_exported_at, source_file_name, mode,
                       status, record_counts_json, diagnostics_json, started_at, completed_at
                FROM emergency_migration_runs
                ORDER BY started_at DESC LIMIT 20
                """
            ).fetchall()
            file_statuses = connection.execute(
                "SELECT status, COUNT(*) AS count FROM emergency_file_manifest GROUP BY status"
            ).fetchall()
        result_runs = []
        for row in runs:
            value = dict(row)
            value["record_counts"] = json.loads(value.pop("record_counts_json") or "{}")
            value["diagnostics"] = json.loads(value.pop("diagnostics_json") or "[]")
            result_runs.append(value)
        return {
            "runs": result_runs,
            "fileStatuses": {str(row["status"]): int(row["count"]) for row in file_statuses},
        }

    def run(
        self,
        export_path: str | Path,
        *,
        dry_run: bool = False,
        force_replay: bool = False,
        public_media: bool = False,
    ) -> dict[str, Any]:
        tables, source_hash, exported_at = self.load_export(export_path)
        started = _now()
        with connect() as connection:
            existing = connection.execute(
                "SELECT * FROM emergency_migration_runs WHERE source_hash = ?",
                (source_hash,),
            ).fetchone()
        if existing is not None and existing["status"] == "completed" and not force_replay:
            return {
                "replayed": True,
                "sourceHash": source_hash,
                "runId": existing["id"],
                "recordCounts": json.loads(existing["record_counts_json"] or "{}"),
                "diagnostics": json.loads(existing["diagnostics_json"] or "[]"),
            }

        sections, diagnostics, _ = self.build_sections(
            tables,
            install_files=not dry_run,
            public_media=public_media,
        )
        errors = [item for item in diagnostics if item.get("severity") == "error"]
        if errors:
            raise MainSiteMigrationValidationError(diagnostics)
        counts = {
            table: len(records)
            for group in sections.values()
            for table, records in group.items()
        }
        if dry_run:
            return {
                "dryRun": True,
                "sourceHash": source_hash,
                "sourceExportedAt": exported_at,
                "recordCounts": counts,
                "diagnostics": diagnostics,
            }

        backup = self.backup_service.create(reason="pre-main-migration")
        run_id = f"migration-{started}-{secrets.token_hex(5)}"
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_migration_runs
                    (id, source_hash, source_exported_at, source_file_name, mode,
                     status, record_counts_json, diagnostics_json, backup_path, started_at)
                VALUES (?, ?, ?, ?, 'one-time-merge', 'processing', ?, ?, ?, ?)
                ON CONFLICT(source_hash) DO UPDATE SET
                    status='processing', diagnostics_json=excluded.diagnostics_json,
                    backup_path=excluded.backup_path, started_at=excluded.started_at
                """,
                (
                    run_id, source_hash, exported_at, Path(export_path).name,
                    _json_dump(counts), _json_dump(diagnostics), backup["path"], started,
                ),
            )
            connection.commit()
            connection.execute("BEGIN IMMEDIATE")
            applied: dict[str, int] = {}
            try:
                for section in ("files", "commerce", "communication"):
                    for spec in COMPLETION_SECTION_SPECS[section]:
                        applied[spec.table] = self._upsert_records(
                            connection, spec, sections[section][spec.table]
                        )
                connection.execute(
                    """
                    UPDATE emergency_migration_runs
                    SET status='completed', record_counts_json=?, diagnostics_json=?, completed_at=?
                    WHERE source_hash=?
                    """,
                    (_json_dump(applied), _json_dump(diagnostics), _now(), source_hash),
                )
                connection.execute(
                    """
                    INSERT INTO emergency_audit_events
                        (id, actor_id, action, resource_type, resource_id, occurred_at, metadata_json)
                    VALUES (?, 'main-migration-cli', 'main_export.imported', 'migration', ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET occurred_at=excluded.occurred_at,
                        metadata_json=excluded.metadata_json
                    """,
                    (
                        f"audit-main-migration:{source_hash[:24]}",
                        run_id, _now(), _json_dump({"sourceHash": source_hash, "counts": applied}),
                    ),
                )
                connection.commit()
            except Exception:
                connection.rollback()
                with connect() as failure_connection:
                    failure_connection.execute(
                        "UPDATE emergency_migration_runs SET status='failed', completed_at=? WHERE source_hash=?",
                        (_now(), source_hash),
                    )
                raise
        return {
            "dryRun": False,
            "replayed": False,
            "runId": run_id,
            "sourceHash": source_hash,
            "sourceExportedAt": exported_at,
            "recordCounts": applied,
            "diagnostics": diagnostics,
            "preMigrationBackup": backup,
        }

    @staticmethod
    def _upsert_records(connection: sqlite3.Connection, spec: Any, records: Iterable[dict[str, Any]]) -> int:
        if not records:
            return 0
        columns = [str(row["name"]) for row in connection.execute(f"PRAGMA table_info({spec.table})")]
        applied = 0
        for source_record in records:
            encoded = dict(source_record)
            for column in spec.json_columns:
                if column in encoded and not isinstance(encoded[column], str):
                    encoded[column] = _json_dump(encoded[column])
            for column in spec.boolean_columns:
                if column in encoded:
                    encoded[column] = int(bool(encoded[column]))
            unknown = set(encoded) - set(columns)
            if unknown:
                raise MainSiteMigrationError(f"unknown_columns:{spec.table}")
            record = {column: encoded.get(column) for column in columns}
            names = list(record)
            updates = ", ".join(f"{column}=excluded.{column}" for column in names if column != spec.primary_key)
            connection.execute(
                f"INSERT INTO {spec.table} ({', '.join(names)}) VALUES ({', '.join('?' for _ in names)}) "
                f"ON CONFLICT({spec.primary_key}) DO UPDATE SET {updates}",
                tuple(record[column] for column in names),
            )
            applied += 1
        return applied
