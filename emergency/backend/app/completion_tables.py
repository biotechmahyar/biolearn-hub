"""Shared storage metadata for phase-nine completed snapshot sections."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class CompletionTableSpec:
    table: str
    primary_key: str
    json_columns: frozenset[str] = frozenset()
    boolean_columns: frozenset[str] = frozenset()


COMPLETION_SECTION_SPECS: dict[str, tuple[CompletionTableSpec, ...]] = {
    "commerce": (
        CompletionTableSpec("emergency_commerce_products", "id", frozenset({"metadata_json"})),
        CompletionTableSpec("emergency_commerce_coupons", "id", frozenset({"constraints_json"}), frozenset({"active"})),
        CompletionTableSpec("emergency_commerce_orders", "id", frozenset({"items_json", "metadata_json"})),
        CompletionTableSpec("emergency_commerce_marketplace_orders", "id", frozenset({"delivery_json", "payment_json"})),
        CompletionTableSpec("emergency_commerce_reviews", "id"),
        CompletionTableSpec("emergency_commerce_wallets", "id"),
        CompletionTableSpec("emergency_commerce_wallet_transactions", "id", frozenset({"metadata_json"})),
        CompletionTableSpec("emergency_commerce_payment_records", "id", frozenset({"metadata_json"})),
        CompletionTableSpec("emergency_commerce_subscriptions", "id", frozenset({"metadata_json"}), frozenset({"active"})),
    ),
    "communication": (
        CompletionTableSpec("emergency_communication_notifications", "id", frozenset({"metadata_json"}), frozenset({"is_read"})),
        CompletionTableSpec("emergency_communication_announcements", "id", frozenset({"metadata_json"})),
        CompletionTableSpec("emergency_communication_inbox_messages", "id", frozenset({"metadata_json"}), frozenset({"is_read"})),
        CompletionTableSpec("emergency_communication_support_tickets", "id", frozenset({"metadata_json"})),
        CompletionTableSpec("emergency_communication_support_messages", "id", frozenset({"metadata_json"})),
        CompletionTableSpec("emergency_communication_direct_messages", "id", frozenset({"metadata_json"}), frozenset({"is_read"})),
        CompletionTableSpec("emergency_communication_mentor_groups", "id"),
        CompletionTableSpec("emergency_communication_mentor_group_members", "id"),
        CompletionTableSpec("emergency_communication_mentor_questions", "id"),
        CompletionTableSpec("emergency_communication_mentor_sessions", "id"),
        CompletionTableSpec("emergency_communication_comments", "id", boolean_columns=frozenset({"approved", "rejected"})),
    ),
    "files": (
        CompletionTableSpec("emergency_file_manifest", "id", frozenset({"metadata_json"}), frozenset({"is_sensitive"})),
    ),
}


def records_for_spec(sections: dict[str, Any], spec: CompletionTableSpec) -> list[dict[str, Any]]:
    value = sections.get(spec.table, [])
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        return [item for item in value.get("records", []) if isinstance(item, dict)]
    return []
