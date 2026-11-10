import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import pytest

from erpflow_ai import usage


def _set_usage_file(monkeypatch, tmp_path, limit=20):
    path = tmp_path / "gemini_usage.json"
    monkeypatch.setenv("GEMINI_USAGE_FILE", str(path))
    monkeypatch.setenv("GEMINI_DAILY_REQUEST_LIMIT", str(limit))
    monkeypatch.setenv("GEMINI_USAGE_TIMEZONE", "UTC")
    return path


def test_request_one_and_request_twenty_are_allowed(monkeypatch, tmp_path):
    _set_usage_file(monkeypatch, tmp_path)

    reservations = [
        usage.reserve_gemini_request("test-model")
        for _ in range(20)
    ]

    assert reservations[0].request_number == 1
    assert reservations[-1].request_number == 20


def test_request_twenty_one_is_blocked(monkeypatch, tmp_path):
    _set_usage_file(monkeypatch, tmp_path)
    for _ in range(20):
        usage.reserve_gemini_request("test-model")

    with pytest.raises(usage.GeminiDailyLimitExceeded, match="daily"):
        usage.reserve_gemini_request("test-model")


def test_counter_resets_on_next_accounting_day(monkeypatch, tmp_path):
    path = _set_usage_file(monkeypatch, tmp_path, limit=1)
    reservation = usage.reserve_gemini_request("test-model")
    state = json.loads(path.read_text(encoding="utf-8"))
    yesterday = (
        datetime.now().date() - timedelta(days=1)
    ).isoformat()
    state["date"] = yesterday
    path.write_text(json.dumps(state), encoding="utf-8")

    next_reservation = usage.reserve_gemini_request("test-model")

    assert next_reservation.request_number == 1
    assert reservation.accounting_date != yesterday


def test_counter_persists_after_recreating_service(monkeypatch, tmp_path):
    _set_usage_file(monkeypatch, tmp_path, limit=2)
    first = usage.reserve_gemini_request("test-model")

    second = usage.reserve_gemini_request("test-model")

    assert first.request_number == 1
    assert second.request_number == 2


def test_missing_usage_metadata_is_logged_and_persisted(
    monkeypatch,
    tmp_path,
    caplog,
):
    caplog.set_level("INFO")
    path = _set_usage_file(monkeypatch, tmp_path)
    reservation = usage.reserve_gemini_request("test-model")

    usage.complete_gemini_request(reservation, response=object(), succeeded=True)

    state = json.loads(path.read_text(encoding="utf-8"))
    assert state["requests"][0]["status"] == "succeeded"
    assert state["requests"][0]["total_tokens"] is None
    assert "Gemini generation completed" in caplog.text


def test_failed_request_is_counted(monkeypatch, tmp_path):
    path = _set_usage_file(monkeypatch, tmp_path, limit=1)
    reservation = usage.reserve_gemini_request("test-model")
    usage.complete_gemini_request(reservation, succeeded=False)

    state = json.loads(path.read_text(encoding="utf-8"))
    assert state["requests"][0]["status"] == "failed"
    with pytest.raises(usage.GeminiDailyLimitExceeded):
        usage.reserve_gemini_request("test-model")


def test_concurrent_requests_cannot_exceed_limit(monkeypatch, tmp_path):
    _set_usage_file(monkeypatch, tmp_path, limit=2)

    def reserve():
        try:
            return usage.reserve_gemini_request("test-model").request_number
        except usage.GeminiDailyLimitExceeded:
            return None

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(lambda _: reserve(), range(8)))

    allowed = sorted(value for value in results if value is not None)
    assert allowed == [1, 2]
