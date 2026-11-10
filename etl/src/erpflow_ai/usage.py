"""Persistent, concurrency-safe Gemini request accounting."""

from __future__ import annotations

import json
import logging
import os
import time
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

DEFAULT_DAILY_LIMIT = 20
DEFAULT_TIMEZONE = "Asia/Manila"
DEFAULT_USAGE_FILE = "/app/data/output/gemini_usage.json"

try:
    import fcntl
except ImportError:  # pragma: no cover - used only on Windows hosts
    fcntl = None


class GeminiDailyLimitExceeded(RuntimeError):
    """Raised when the configured daily Gemini request limit is exhausted."""

    def __init__(self) -> None:
        super().__init__(
            "The ERPFlow AI daily Gemini usage limit has been reached. "
            "Please try again tomorrow."
        )


@dataclass(frozen=True)
class GeminiRequestReservation:
    accounting_date: str
    request_number: int
    model: str
    usage_file: str


def _daily_limit() -> int:
    raw_limit = os.getenv(
        "GEMINI_DAILY_REQUEST_LIMIT",
        str(DEFAULT_DAILY_LIMIT),
    )
    try:
        limit = int(raw_limit)
    except ValueError as error:
        raise RuntimeError(
            "GEMINI_DAILY_REQUEST_LIMIT must be a positive integer."
        ) from error
    if limit < 1:
        raise RuntimeError(
            "GEMINI_DAILY_REQUEST_LIMIT must be a positive integer."
        )
    return limit


def _usage_timezone() -> ZoneInfo:
    name = os.getenv("GEMINI_USAGE_TIMEZONE", DEFAULT_TIMEZONE)
    try:
        return ZoneInfo(name)
    except KeyError as error:
        raise RuntimeError(
            "GEMINI_USAGE_TIMEZONE must name a valid IANA timezone."
        ) from error


def _usage_path() -> Path:
    return Path(os.getenv("GEMINI_USAGE_FILE", DEFAULT_USAGE_FILE))


@contextmanager
def _locked_usage_file(path: Path) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_name(f"{path.name}.lock")

    if fcntl is not None:
        with lock_path.open("a+", encoding="utf-8") as lock_file:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            try:
                yield
            finally:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        return

    import msvcrt

    with lock_path.open("a+", encoding="utf-8") as lock_file:
        lock_file.seek(0)
        while True:
            try:
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
                break
            except OSError:
                time.sleep(0.05)
        try:
            yield
        finally:
            lock_file.seek(0)
            msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)


def _read_state(path: Path, accounting_date: str) -> dict[str, Any]:
    if not path.exists():
        return {"date": accounting_date, "requests": []}

    try:
        state = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        logger.error("Gemini usage counter could not be read.")
        raise RuntimeError("Gemini usage counter is unavailable.") from error

    if not isinstance(state, dict) or not isinstance(
        state.get("requests", []),
        list,
    ):
        logger.error("Gemini usage counter has an invalid format.")
        raise RuntimeError("Gemini usage counter is unavailable.")

    if state.get("date") != accounting_date:
        return {"date": accounting_date, "requests": []}
    return state


def _write_state(path: Path, state: dict[str, Any]) -> None:
    temporary_path = path.with_name(f".{path.name}.tmp")
    temporary_path.write_text(
        json.dumps(state, separators=(",", ":")),
        encoding="utf-8",
    )
    temporary_path.replace(path)


def reserve_gemini_request(model: str) -> GeminiRequestReservation:
    """Reserve one request before making a Gemini generation call."""

    accounting_date = datetime.now(_usage_timezone()).date().isoformat()
    path = _usage_path()

    with _locked_usage_file(path):
        state = _read_state(path, accounting_date)
        requests = state["requests"]
        request_number = len(requests) + 1
        if request_number > _daily_limit():
            raise GeminiDailyLimitExceeded

        requests.append(
            {
                "request_number": request_number,
                "model": model,
                "started_at": datetime.now(
                    _usage_timezone()
                ).isoformat(),
                "status": "in_progress",
            }
        )
        _write_state(path, state)

    logger.info(
        "Gemini generation request reserved: timestamp=%s model=%s "
        "request_number=%d accounting_date=%s",
        datetime.now(_usage_timezone()).isoformat(),
        model,
        request_number,
        accounting_date,
    )
    return GeminiRequestReservation(
        accounting_date=accounting_date,
        request_number=request_number,
        model=model,
        usage_file=str(path),
    )


def _usage_value(metadata: Any, name: str) -> int | None:
    value = (
        metadata.get(name)
        if isinstance(metadata, dict)
        else getattr(metadata, name, None)
    )
    return value if isinstance(value, int) else None


def complete_gemini_request(
    reservation: GeminiRequestReservation,
    response: Any = None,
    *,
    succeeded: bool,
) -> None:
    """Persist safe usage metadata and emit a backend-only usage log."""

    metadata = getattr(response, "usage_metadata", None)
    input_tokens = _usage_value(metadata, "prompt_token_count")
    output_tokens = _usage_value(metadata, "candidates_token_count")
    total_tokens = _usage_value(metadata, "total_token_count")
    status = "succeeded" if succeeded else "failed"
    path = Path(reservation.usage_file)

    with _locked_usage_file(path):
        current_date = datetime.now(_usage_timezone()).date().isoformat()
        if current_date != reservation.accounting_date:
            logger.warning(
                "Gemini usage completion crossed an accounting day boundary."
            )
            return
        state = _read_state(path, current_date)
        for request in state["requests"]:
            if request.get("request_number") == reservation.request_number:
                request.update(
                    {
                        "status": status,
                        "completed_at": datetime.now(
                            _usage_timezone()
                        ).isoformat(),
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "total_tokens": total_tokens,
                    }
                )
                break
        _write_state(path, state)

    logger.info(
        "Gemini generation completed: timestamp=%s model=%s "
        "request_number=%d status=%s input_tokens=%s output_tokens=%s "
        "total_tokens=%s",
        datetime.now(_usage_timezone()).isoformat(),
        reservation.model,
        reservation.request_number,
        status,
        input_tokens,
        output_tokens,
        total_tokens,
    )
