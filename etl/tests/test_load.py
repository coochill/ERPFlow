import pandas as pd
from erpflow_etl.load import load_inventory
import pytest
import requests

class FakeResponse:
    def __init__(self, body):
        self.body = body

    def raise_for_status(self):
        pass

    def json(self):
        return self.body


def test_load_inventory_writes_import_results(tmp_path, monkeypatch):
    def fake_post(url, json, headers, timeout):
        assert url == "http://nginx/api/items/import"
        assert len(json["rows"]) == 2

        # The source quantity is sent for validation, but the API
        # determines the actual initial stock quantity.
        assert json["rows"][0]["quantity"] == 10

        return FakeResponse({
            "total_rows": 2,
            "imported": 1,
            "conflicts": 1,
            "results": [
                {
                    "sku": "SKU-001",
                    "status": "imported",
                    "item_id": 12,
                    "message": "Item created with zero stock.",
                },
                {
                    "sku": "SKU-002",
                    "status": "conflict",
                    "message": "SKU already exists.",
                },
            ],
        })

    monkeypatch.setattr("erpflow_etl.load.requests.post", fake_post)

    data = pd.DataFrame([
        {
            "sku": "SKU-001",
            "name": "Keyboard",
            "quantity": 10,
            "unit_price": 500,
        },
        {
            "sku": "SKU-002",
            "name": "Mouse",
            "quantity": 15,
            "unit_price": 350,
        },
    ])

    summary = load_inventory(
        data,
        tmp_path,
        "http://nginx/api",
    )

    assert summary["submitted_rows"] == 2
    assert summary["imported"] == 1
    assert summary["conflicts"] == 1

    report = pd.read_csv(summary["report_file"])
    assert report["status"].tolist() == ["imported", "conflict"]
    assert report["source_quantity"].tolist() == [10, 15]
    assert report.loc[0, "item_id"] == 12


def test_load_failure_saves_report_and_marks_later_rows_not_submitted(
    tmp_path, monkeypatch
):
    def failing_post(*args, **kwargs):
        raise requests.ConnectionError("Connection lost")

    monkeypatch.setattr(
        "erpflow_etl.load.requests.post",
        failing_post,
    )

    data = pd.DataFrame([
        {"sku": "SKU-101", "name": "Keyboard", "quantity": 10},
        {"sku": "SKU-102", "name": "Mouse", "quantity": 15},
    ])

    with pytest.raises(ValueError, match="Review"):
        load_inventory(
            data,
            tmp_path,
            "http://nginx/api",
            batch_size=1,
        )

    report = pd.read_csv(tmp_path / "import_results.csv")

    assert report["sku"].tolist() == ["SKU-101", "SKU-102"]
    assert report["status"].tolist() == [
        "outcome_unknown",
        "not_submitted",
    ]


def test_load_rejects_unexpected_api_response_and_saves_report(
    tmp_path, monkeypatch
):
    class UnexpectedResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"unexpected": []}

    monkeypatch.setattr(
        "erpflow_etl.load.requests.post",
        lambda *args, **kwargs: UnexpectedResponse(),
    )

    data = pd.DataFrame([
        {"sku": "SKU-103", "name": "Monitor", "quantity": 4},
    ])

    with pytest.raises(ValueError, match="Review"):
        load_inventory(
            data,
            tmp_path,
            "http://nginx/api",
        )

    report = pd.read_csv(tmp_path / "import_results.csv")

    assert report.loc[0, "status"] == "outcome_unknown"
    assert "missing its results list" in report.loc[0, "message"]

def test_load_inventory_skips_api_for_empty_input(tmp_path, monkeypatch):
    def unexpected_post(*args, **kwargs):
        raise AssertionError("API should not be called for empty input")

    monkeypatch.setattr("erpflow_etl.load.requests.post", unexpected_post)

    summary = load_inventory(
        pd.DataFrame(columns=["sku", "name"]),
        tmp_path,
        "http://nginx/api",
    )

    assert summary["submitted_rows"] == 0
    assert summary["imported"] == 0
    assert summary["conflicts"] == 0
