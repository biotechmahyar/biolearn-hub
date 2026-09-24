from app.snapshot_contract import (
    SNAPSHOT_CONTRACT_VERSION,
    SNAPSHOT_SECTIONS,
    build_manifest,
    validate_manifest,
)


def test_manifest_contains_all_required_sections() -> None:
    manifest = build_manifest(
        snapshot_id="genova-test-001",
        created_at="2026-03-12T12:00:00Z",
        record_counts={"identity": 2, "content": 3},
    )

    assert manifest.contract_version == SNAPSHOT_CONTRACT_VERSION
    assert manifest.sections == SNAPSHOT_SECTIONS
    assert validate_manifest(manifest) == []


def test_manifest_validation_rejects_missing_identity() -> None:
    manifest = build_manifest(
        snapshot_id="genova-test-002",
        created_at="2026-03-12T12:00:00Z",
    )
    object.__setattr__(manifest, "sections", ("manifest", "content"))

    errors = validate_manifest(manifest)
    assert any(error.startswith("missing_sections:") for error in errors)
