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

def test_rag_retrieval_requires_service_token(client):
    response = client.post(
        "/internal/rag/retrieve",
        json={
            "question": "What is the purchase approval process?"
        },
    )

    assert response.status_code == 401


def test_rag_retrieval_returns_policy_excerpts(client):
    response = client.post(
        "/internal/rag/retrieve",
        headers=auth_headers(),
        json={
            "question": "Who approves a purchase above $50,000?",
            "top_k": 3,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["question"] == (
        "Who approves a purchase above $50,000?"
    )
    assert data["result_count"] > 0
    result = data["results"][0]

    assert result["policy_id"] == "NTC-PRC-001"
    assert result["version"]
    assert result["effective_date"]
    assert result["section"]
    assert result["text"]
    assert result["score"] > 0
    assert result["matched_terms"]


def test_combined_assistant_requires_service_token(client):
    response = client.post(
        "/internal/assistant/ask",
        json={"question": "Show low-stock items."},
    )

    assert response.status_code == 401


def test_combined_assistant_returns_live_data_metadata(client, monkeypatch):
    async def mock_answer_question(**kwargs):
        return {
            "question": kwargs["question"],
            "answer": "There are two low-stock items.",
            "source_count": 0,
            "sources": [],
            "used_live_data": True,
            "live_tools": ["get_low_stock_items"],
        }

    monkeypatch.setattr(
        api,
        "answer_question",
        mock_answer_question,
    )

    response = client.post(
        "/internal/assistant/ask",
        headers=auth_headers(),
        json={"question": "Show low-stock items.", "top_k": 3},
    )

    assert response.status_code == 200
    assert response.json()["used_live_data"] is True
    assert response.json()["live_tools"] == ["get_low_stock_items"]


def test_combined_assistant_reports_daily_gemini_limit(client, monkeypatch):
    async def mock_answer_question(**kwargs):
        raise api.GeminiDailyLimitExceeded

    monkeypatch.setattr(
        api,
        "answer_question",
        mock_answer_question,
    )

    response = client.post(
        "/internal/assistant/ask",
        headers=auth_headers(),
        json={"question": "What is the inventory policy?"},
    )

    assert response.status_code == 429
    assert "daily Gemini usage limit" in response.json()["detail"]


def test_rag_retrieval_rejects_empty_question(client):
    response = client.post(
        "/internal/rag/retrieve",
        headers=auth_headers(),
        json={"question": "   "},
    )

    assert response.status_code == 422


def test_rag_retrieval_rejects_invalid_top_k(client):
    response = client.post(
        "/internal/rag/retrieve",
        headers=auth_headers(),
        json={
            "question": "inventory policy",
            "top_k": 0,
        },
    )

    assert response.status_code == 422


def test_rag_retrieval_returns_empty_results_for_unknown_question(client):
    response = client.post(
        "/internal/rag/retrieve",
        headers=auth_headers(),
        json={
            "question": "xyzzy quux nonexistentterm",
        },
    )

    assert response.status_code == 200
    assert response.json()["result_count"] == 0
    assert response.json()["results"] == []


def test_rag_ask_requires_service_token(client):
    response = client.post(
        "/internal/rag/ask",
        json={
            "question": "What is the purchase approval process?"
        },
    )

    assert response.status_code == 401


def test_rag_ask_returns_generated_answer(client, monkeypatch):
    mock_result = {
        "question": "Who approves a purchase above $50,000?",
        "answer": (
            "The approval authority is determined by the "
            "procurement policy. [NTC-PRC-001, Approval Authority]"
        ),
        "source_count": 1,
        "sources": [
            {
                "chunk_id": "test-chunk-001",
                "source": "procurement_policy.md",
                "policy_id": "NTC-PRC-001",
                "title": "Procurement and Purchase Approvals Policy",
                "version": "2.0",
                "effective_date": "2026-02-01",
                "section": "Approval Authority",
            }
        ],
    }

    def mock_answer_policy_question(question, top_k):
        assert question == "Who approves a purchase above $50,000?"
        assert top_k == 3
        return mock_result

    monkeypatch.setattr(
        api,
        "answer_policy_question",
        mock_answer_policy_question,
    )

    response = client.post(
        "/internal/rag/ask",
        headers=auth_headers(),
        json={
            "question": "Who approves a purchase above $50,000?",
            "top_k": 3,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["question"] == mock_result["question"]
    assert data["answer"] == mock_result["answer"]
    assert data["source_count"] == 1
    assert data["sources"][0]["policy_id"] == "NTC-PRC-001"
    assert data["sources"][0]["section"] == "Approval Authority"


def test_rag_ask_rejects_empty_question(client):
    response = client.post(
        "/internal/rag/ask",
        headers=auth_headers(),
        json={"question": "   "},
    )

    assert response.status_code == 422


def test_rag_ask_rejects_invalid_top_k(client):
    response = client.post(
        "/internal/rag/ask",
        headers=auth_headers(),
        json={
            "question": "inventory policy",
            "top_k": 11,
        },
    )

    assert response.status_code == 422


def test_rag_ask_handles_gemini_generation_failure(client, monkeypatch):
    def mock_answer_policy_question(question, top_k):
        raise RuntimeError("Gemini generation failed.")

    monkeypatch.setattr(
        api,
        "answer_policy_question",
        mock_answer_policy_question,
    )

    response = client.post(
        "/internal/rag/ask",
        headers=auth_headers(),
        json={
            "question": "What is the inventory policy?"
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Unable to generate a policy answer."
    )
