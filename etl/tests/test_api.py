import io
import json
import time
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from erpflow_etl import api


@pytest.fixture
def client(monkeypatch, tmp_path):
    monkeypatch.setenv("ETL_SERVICE_TOKEN", "test-service-token")
    monkeypatch.setattr(api, "PREVIEW_DIR", tmp_path)
    monkeypatch.setattr(api, "PREVIEW_TTL_SECONDS", 3600)

    with TestClient(api.app) as test_client:
        yield test_client


def auth_headers():
    return {"Authorization": "Bearer test-service-token"}


def test_health_endpoint(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "erpflow-etl",
    }


def test_internal_health_requires_service_token(client):
    response = client.get("/internal/health")

    assert response.status_code == 401


def test_internal_health_accepts_valid_service_token(client):
    response = client.get(
        "/internal/health",
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_preview_upload_returns_valid_and_invalid_rows(client, tmp_path):
    csv_content = (
        "sku,name,quantity,unit_price\n"
        "ETL-TEST-001,Keyboard,10,499.99\n"
        "ETL-TEST-002,Mouse,5,249.50\n"
        "ETL-TEST-003,,abc,-10\n"
    )

    response = client.post(
        "/internal/inventory/previews",
        headers=auth_headers(),
        files={
            "file": (
                "inventory.csv",
                io.BytesIO(csv_content.encode("utf-8")),
                "text/csv",
            )
        },
    )

    assert response.status_code == 200
    result = response.json()

    assert result["source_filename"] == "inventory.csv"
    assert result["total_rows"] == 3
    assert result["valid_rows"] == 2
    assert result["invalid_rows"] == 1
    assert len(result["valid_preview"]) == 2
    assert len(result["invalid_preview"]) == 1
    assert "validation_errors" in result["invalid_preview"][0]

    job_dir = tmp_path / result["job_id"]
    assert (job_dir / "metadata.json").is_file()
    assert (job_dir / "valid.csv").is_file()
    assert (job_dir / "invalid.csv").is_file()

    metadata = json.loads(
        (job_dir / "metadata.json").read_text(encoding="utf-8")
    )
    assert metadata["job_id"] == result["job_id"]


def test_preview_upload_rejects_missing_token(client):
    response = client.post(
        "/internal/inventory/previews",
        files={
            "file": (
                "inventory.csv",
                io.BytesIO(b"sku,name,quantity,unit_price\nA,Item,1,10\n"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 401


def test_preview_upload_rejects_invalid_token(client):
    response = client.post(
        "/internal/inventory/previews",
        headers={"Authorization": "Bearer wrong-token"},
        files={
            "file": (
                "inventory.csv",
                io.BytesIO(b"sku,name,quantity,unit_price\nA,Item,1,10\n"),
                "text/csv",
            )
        },
    )

    assert response.status_code == 401


def test_preview_upload_rejects_unsupported_extension(client):
    response = client.post(
        "/internal/inventory/previews",
        headers=auth_headers(),
        files={
            "file": (
                "inventory.txt",
                io.BytesIO(b"some content"),
                "text/plain",
            )
        },
    )

    assert response.status_code == 415


def test_preview_upload_rejects_empty_file(client):
    response = client.post(
        "/internal/inventory/previews",
        headers=auth_headers(),
        files={
            "file": (
                "empty.csv",
                io.BytesIO(b""),
                "text/csv",
            )
        },
    )

    assert response.status_code == 400


def test_preview_upload_rejects_file_over_size_limit(client, monkeypatch):
    monkeypatch.setattr(api, "MAX_FILE_SIZE", 32)

    content = b"sku,name,quantity,unit_price\n" + (b"A" * 64)

    response = client.post(
        "/internal/inventory/previews",
        headers=auth_headers(),
        files={
            "file": (
                "large.csv",
                io.BytesIO(content),
                "text/csv",
            )
        },
    )

    assert response.status_code == 413


def test_expired_preview_is_cleaned_up(client, tmp_path):
    expired_dir = tmp_path / uuid.uuid4().hex
    expired_dir.mkdir()
    (expired_dir / "metadata.json").write_text(
        json.dumps({"expires_at": time.time() - 10}),
        encoding="utf-8",
    )
    (expired_dir / "valid.csv").write_text("sku\nA\n", encoding="utf-8")

    api.cleanup_expired_previews()

    assert not expired_dir.exists()
