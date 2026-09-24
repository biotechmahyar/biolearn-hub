from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root_identifies_emergency_service() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "genova-emergency"


def test_health_reports_database_status() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "genova-emergency"
    assert body["status"] in {"ok", "degraded"}
    assert body["database"] in {"ready", "unavailable"}
