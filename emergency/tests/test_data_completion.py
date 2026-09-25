import json
from pathlib import Path

import pytest

from app.auth_service import AuthService
from app.data_completion_service import (
    FileTransferService,
    MainSiteMigrationService,
    MainSiteMigrationValidationError,
)
from app.db import connect
from app.learning_service import LearningService
from app.operations_service import BackupService
from app.snapshot_service import SnapshotService


NOW = 1_700_000_000_000


def _seed(suffix: str) -> None:
    auth = AuthService()
    for user_id in (f"buyer-{suffix}", f"seller-{suffix}", f"teacher-{suffix}"):
        auth.upsert_user(
            user_id=user_id,
            username=f"{user_id}-{suffix}",
            email=f"{user_id}-{suffix}@example.test",
            role="user",
            created_at=NOW,
        )
    learning = LearningService()
    learning.upsert_category(
        category_id=f"category-{suffix}",
        name=f"Category {suffix}",
        slug=f"category-{suffix}",
    )
    learning.upsert_course(
        course_id=f"course-{suffix}",
        category_id=f"category-{suffix}",
        title=f"Course {suffix}",
        slug=f"course-{suffix}",
    )


def _write_export(path: Path, suffix: str) -> None:
    payload = {
        "exportedAt": "2026-09-25T00:00:00Z",
        "tables": {
            "mediaItems": [{
                "_id": f"media-{suffix}",
                "url": f"{suffix}.bin",
                "name": f"Guide {suffix}.pdf",
                "mimeType": "application/pdf",
                "size": 20,
                "createdAt": NOW,
            }],
            "storeProducts": [{
                "_id": f"product-{suffix}",
                "sellerId": f"seller-{suffix}",
                "title": f"Book {suffix}",
                "slug": f"book-{suffix}",
                "description": "Emergency book",
                "category": "book",
                "condition": "new",
                "price": 1000,
                "stock": 3,
                "status": "approved",
                "createdAt": NOW,
                "updatedAt": NOW,
            }],
            "orders": [{
                "_id": f"order-{suffix}",
                "userId": f"buyer-{suffix}",
                "items": [{"type": "product", "refId": f"product-{suffix}", "title": "Book", "price": 1000}],
                "subtotal": 1000,
                "total": 1000,
                "status": "paid",
                "invoiceNumber": f"INV-{suffix}",
                "createdAt": NOW,
            }],
            "notifications": [{
                "_id": f"notification-{suffix}",
                "userId": f"buyer-{suffix}",
                "type": "course",
                "title": "Complete",
                "body": "Course completed",
                "isRead": False,
                "createdAt": NOW,
            }],
            "supportTickets": [{
                "_id": f"ticket-{suffix}",
                "studentId": f"buyer-{suffix}",
                "studentName": "Buyer",
                "teacherId": f"teacher-{suffix}",
                "courseId": f"course-{suffix}",
                "courseName": "Course",
                "subject": "Help",
                "status": "open",
                "createdAt": NOW,
                "updatedAt": NOW,
                "messages": [{"author": "student", "text": "Question", "at": NOW}],
            }],
            "directMessages": [{
                "_id": f"message-{suffix}",
                "senderId": f"buyer-{suffix}",
                "receiverId": f"teacher-{suffix}",
                "text": "Hello",
                "read": False,
                "createdAt": NOW,
            }],
        },
    }
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")


def _service(tmp_path: Path) -> MainSiteMigrationService:
    return MainSiteMigrationService(
        files_directory=tmp_path,
        file_service=FileTransferService(tmp_path / "file-store"),
        backup_service=BackupService(tmp_path / "backups"),
    )


def test_main_export_dry_run_import_replay_and_snapshot_round_trip(tmp_path: Path) -> None:
    suffix = "roundtrip"
    _seed(suffix)
    payload = tmp_path / f"{suffix}.bin"
    payload.write_bytes(b"phase-nine-file-payload")
    export_path = tmp_path / "main-export.json"
    _write_export(export_path, suffix)
    service = _service(tmp_path)

    dry_run = service.run(export_path, dry_run=True)
    assert dry_run["dryRun"] is True
    assert dry_run["recordCounts"]["emergency_commerce_products"] == 1

    imported = service.run(export_path)
    assert imported["replayed"] is False
    assert imported["recordCounts"]["emergency_communication_support_messages"] == 1
    replay = service.run(export_path)
    assert replay["replayed"] is True

    with connect() as connection:
        manifest = connection.execute(
            "SELECT sha256, local_path FROM emergency_file_manifest WHERE storage_id = ?",
            (f"{suffix}.bin",),
        ).fetchone()
    assert manifest is not None
    assert (tmp_path / "file-store" / str(manifest["local_path"])).is_file()

    snapshots = SnapshotService(
        tmp_path / "artifacts",
        backup_root=tmp_path / "snapshot-backups",
    )
    exported = snapshots.export("phase-nine-complete")
    assert exported["manifest"]["record_counts"]["commerce"] > 0
    assert exported["manifest"]["record_counts"]["communication"] > 0
    assert exported["manifest"]["record_counts"]["files"] == 1
    assert snapshots.validate("phase-nine-complete")["valid"] is True
    replayed = snapshots.import_artifact("phase-nine-complete")
    assert replayed["applied"]["emergency_commerce_products"] == 1
    snapshots.export("phase-nine-safe")
    safe_data = json.loads(
        (tmp_path / "artifacts" / "phase-nine-safe" / "data.json").read_text(encoding="utf-8")
    )
    safe_file = safe_data["sections"]["files"][0]
    assert safe_file["original_ref"] is None
    assert safe_file["local_path"] is None
    assert safe_file["status"] == "redacted"


def test_missing_relationship_aborts_without_partial_records(tmp_path: Path) -> None:
    export_path = tmp_path / "missing-relationship.json"
    export_path.write_text(json.dumps({
        "tables": {
            "orders": [{
                "_id": "order-missing-user",
                "userId": "does-not-exist",
                "items": [],
                "subtotal": 100,
                "total": 100,
                "status": "paid",
                "createdAt": NOW,
            }]
        }
    }), encoding="utf-8")
    with pytest.raises(MainSiteMigrationValidationError) as raised:
        _service(tmp_path).run(export_path)
    assert any(item["code"] == "missing_relationship" for item in raised.value.diagnostics)
    with connect() as connection:
        assert connection.execute(
            "SELECT 1 FROM emergency_commerce_orders WHERE id = ?", ("order-missing-user",)
        ).fetchone() is None


def test_file_lookup_cannot_escape_payload_directory(tmp_path: Path) -> None:
    files = tmp_path / "files"
    files.mkdir()
    outside = tmp_path / "outside.bin"
    outside.write_bytes(b"outside")
    manifest = FileTransferService(tmp_path / "store").build_manifest(
        source_ref="../outside.bin",
        name="outside.bin",
        source_table="mediaItems",
        source_field="url",
        created_at=NOW,
        is_sensitive=True,
        files_directory=files,
        install=False,
    )
    assert manifest["status"] == "missing"
    assert manifest["local_path"] is None
