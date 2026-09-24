"""Versioned contract for a complete Genova emergency snapshot.

This module defines the transport contract only. It does not read Convex or
Freebuff, and it does not create an export yet. The export/import pipeline in
later phases will produce and consume this structure.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Mapping

SNAPSHOT_CONTRACT_VERSION = 1

# Logical sections are intentionally independent of a particular Convex table
# layout. The exporter will map the source tables into these sections later.
SNAPSHOT_SECTIONS: tuple[str, ...] = (
    "manifest",
    "identity",
    "auth_accounts",
    "auth_sessions",
    "auth_tokens",
    "auth_secrets",
    "profiles",
    "roles",
    "content",
    "learning",
    "assessments",
    "commerce",
    "communication",
    "platform_settings",
    "bots",
    "payments",
    "files",
    "audit",
)


@dataclass(frozen=True)
class SnapshotManifest:
    contract_version: int
    snapshot_id: str
    source: str
    created_at: str
    source_version: str
    sections: tuple[str, ...]
    record_counts: Mapping[str, int]
    compatibility: Mapping[str, str]

    def to_dict(self) -> dict[str, Any]:
        value = asdict(self)
        value["sections"] = list(self.sections)
        value["record_counts"] = dict(self.record_counts)
        value["compatibility"] = dict(self.compatibility)
        return value


def build_manifest(
    *,
    snapshot_id: str,
    created_at: str,
    source: str = "genova-main",
    source_version: str = "unknown",
    record_counts: Mapping[str, int] | None = None,
) -> SnapshotManifest:
    """Build a manifest for a complete snapshot.

    Export code will replace the empty counts in later phases. Keeping this
    function here makes the contract executable and testable from day one.
    """
    return SnapshotManifest(
        contract_version=SNAPSHOT_CONTRACT_VERSION,
        snapshot_id=snapshot_id,
        source=source,
        created_at=created_at,
        source_version=source_version,
        sections=SNAPSHOT_SECTIONS,
        record_counts=dict(record_counts or {}),
        compatibility={
            "identity": "native",
            "sessions": "native",
            "tokens": "native",
            "content": "json",
            "files": "manifest-and-payload",
        },
    )


def validate_manifest(manifest: SnapshotManifest) -> list[str]:
    """Return contract errors without importing any external service."""
    errors: list[str] = []
    if manifest.contract_version != SNAPSHOT_CONTRACT_VERSION:
        errors.append("unsupported_contract_version")
    missing = [section for section in SNAPSHOT_SECTIONS if section not in manifest.sections]
    if missing:
        errors.append(f"missing_sections:{','.join(missing)}")
    if not manifest.snapshot_id.strip():
        errors.append("missing_snapshot_id")
    if not manifest.created_at.strip():
        errors.append("missing_created_at")
    for section, count in manifest.record_counts.items():
        if count < 0:
            errors.append(f"negative_record_count:{section}")
    return errors
