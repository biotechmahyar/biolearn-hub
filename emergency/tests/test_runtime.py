from app.auth_service import AuthService
from app.runtime_service import RuntimeNotFound, RuntimeService


def seed_user(user_id: str) -> None:
    AuthService().upsert_user(
        user_id=user_id,
        username=f"runtime-{user_id}",
        email=f"{user_id}@example.test",
        role="user",
    )


def test_runtime_settings_are_redacted_by_default() -> None:
    runtime = RuntimeService()
    runtime.upsert_runtime_setting(key="site.name", value="Genova Emergency")
    runtime.upsert_runtime_setting(key="payments.apiKey", value="do-not-expose", is_secret=True)
    settings = runtime.list_runtime_settings()
    values = {item["key"]: item["value"] for item in settings}
    assert values["site.name"] == "Genova Emergency"
    assert values["payments.apiKey"] == "[REDACTED]"
    assert {item["key"]: item["value"] for item in runtime.list_runtime_settings(include_secrets=True)}["payments.apiKey"] == "do-not-expose"


def test_bot_import_and_user_links_are_idempotent() -> None:
    runtime = RuntimeService()
    seed_user("runtime-user-1")
    runtime.upsert_bot(
        bot_id="runtime-bot-1",
        provider="telegram",
        name="Genova Telegram",
        status="active",
        webhook_url="https://example.test/telegram-hook",
        config={"token": "telegram-secret", "allowed_updates": ["message"]},
    )
    runtime.upsert_bot_command(
        command_id="runtime-command-1",
        bot_id="runtime-bot-1",
        command="/start",
        description="Start bot",
        payload={"locale": "fa"},
    )
    runtime.link_bot_user(
        link_id="runtime-link-1",
        bot_id="runtime-bot-1",
        user_id="runtime-user-1",
        external_user_id="12345",
    )
    runtime.link_bot_user(
        link_id="runtime-link-1",
        bot_id="runtime-bot-1",
        user_id="runtime-user-1",
        external_user_id="12345",
    )
    bots = runtime.list_bots()
    assert len(bots) == 1
    assert bots[0]["commands"][0]["command"] == "/start"
    assert bots[0]["config"]["token"] == "[REDACTED]"
    assert bots[0]["config"]["allowed_updates"] == ["message"]


def test_payment_import_tracks_status_history_and_user_scope() -> None:
    runtime = RuntimeService()
    seed_user("runtime-user-2")
    runtime.upsert_payment_gateway(
        gateway_id="runtime-gateway-1",
        provider="zarinpal",
        display_name="Zarinpal",
        merchant_reference="merchant-1",
        status="active",
        config={"apiKey": "secret", "sandbox": True},
    )
    runtime.upsert_payment_gateway(
        gateway_id="runtime-gateway-1",
        provider="zarinpal",
        display_name="Zarinpal",
        merchant_reference="merchant-1",
        status="active",
        config={"apiKey": "secret", "sandbox": True},
    )
    runtime.upsert_payment_transaction(
        transaction_id="runtime-transaction-1",
        gateway_id="runtime-gateway-1",
        user_id="runtime-user-2",
        provider_reference="provider-1",
        amount_minor=125000,
        status="pending",
    )
    runtime.upsert_payment_transaction(
        transaction_id="runtime-transaction-1",
        gateway_id="runtime-gateway-1",
        user_id="runtime-user-2",
        provider_reference="provider-1",
        amount_minor=125000,
        status="paid",
        paid_at=1700000000,
    )
    transaction = runtime.get_payment_transaction("runtime-transaction-1")
    assert transaction["status"] == "paid"
    assert [item["status"] for item in transaction["statusHistory"]] == ["pending", "paid"]
    assert len(runtime.list_payment_transactions(user_id="runtime-user-2")) == 1
    assert runtime.list_payment_transactions(user_id="missing-user") == []
    gateways = runtime.list_payment_gateways()
    assert gateways[0]["config"]["apiKey"] == "[REDACTED]"

    try:
        runtime.get_payment_transaction("missing-transaction")
    except RuntimeNotFound as error:
        assert str(error) == "transaction_not_found"
    else:
        raise AssertionError("missing transaction was returned")
