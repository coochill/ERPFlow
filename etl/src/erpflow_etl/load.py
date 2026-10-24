from pathlib import Path

import pandas as pd
import requests


IMPORT_FIELDS = (
    "sku",
    "name",
    "description",
    "quantity",
    "reorder_level",
    "unit_price",
    "unit",
)

REPORT_COLUMNS = [
    "sku",
    "name",
    "source_quantity",
    "status",
    "item_id",
    "message",
]


def _clean_value(value):
    """Convert pandas missing values to JSON-safe Python values."""
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if hasattr(value, "item"):
        return value.item()

    return value


def _report_row(source, status, message, item_id=None, sku=None):
    return {
        "sku": sku if sku is not None else source.get("sku"),
        "name": source.get("name"),
        "source_quantity": _clean_value(source.get("quantity")),
        "status": status,
        "item_id": item_id,
        "message": message,
    }


def _save_report(results, report_path):
    pd.DataFrame(results, columns=REPORT_COLUMNS).to_csv(
        report_path, index=False
    )


def load_inventory(
    valid_rows: pd.DataFrame,
    output_dir: str | Path,
    api_base_url: str,
    api_token: str | None = None,
    batch_size: int = 500,
) -> dict:
    """Import validated rows and persist a report after each batch."""
    if not api_base_url.strip():
        raise ValueError("API base URL must not be empty.")

    if not 1 <= batch_size <= 500:
        raise ValueError("Batch size must be between 1 and 500.")

    missing = {"sku", "name"} - set(valid_rows.columns)
    if missing and not valid_rows.empty:
        raise ValueError(
            f"Missing required loader columns: {sorted(missing)}"
        )

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    report_path = output_path / "import_results.csv"
    results = []

    headers = {}
    if api_token:
        headers["Authorization"] = f"Bearer {api_token}"

    endpoint = f"{api_base_url.rstrip('/')}/items/import"

    if valid_rows.empty:
        _save_report(results, report_path)
        return {
            "submitted_rows": 0,
            "imported": 0,
            "conflicts": 0,
            "outcome_unknown": 0,
            "not_submitted": 0,
            "report_file": str(report_path),
        }

    records = valid_rows.to_dict(orient="records")

    for start in range(0, len(records), batch_size):
        batch = records[start : start + batch_size]
        payload_rows = []

        for record in batch:
            payload = {}

            for field in IMPORT_FIELDS:
                if field not in record:
                    continue

                value = _clean_value(record[field])

                if value is None and field in {
                    "description",
                    "reorder_level",
                    "unit_price",
                    "unit",
                }:
                    continue

                payload[field] = value

            payload_rows.append(payload)

        try:
            response = requests.post(
                endpoint,
                json={"rows": payload_rows},
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            body = response.json()

            if not isinstance(body, dict):
                raise ValueError("API response must be a JSON object.")

            batch_results = body.get("results")
            if not isinstance(batch_results, list):
                raise ValueError("API response is missing its results list.")

            if len(batch_results) != len(batch):
                raise ValueError(
                    "API response row count does not match submitted batch."
                )

            parsed_results = []
            for source, result in zip(batch, batch_results):
                if not isinstance(result, dict):
                    raise ValueError("API returned an invalid row result.")

                status = result.get("status")
                if status not in {"imported", "conflict"}:
                    raise ValueError(
                        f"API returned an unexpected status: {status!r}"
                    )

                parsed_results.append(
                    _report_row(
                        source,
                        status,
                        result.get("message", ""),
                        item_id=result.get("item_id"),
                        sku=result.get("sku"),
                    )
                )

            results.extend(parsed_results)
            _save_report(results, report_path)

        except (requests.RequestException, ValueError, TypeError) as exc:
            # A lost response does not prove that the server made no changes.
            for source in batch:
                results.append(
                    _report_row(
                        source,
                        "outcome_unknown",
                        f"Request outcome could not be confirmed: {exc}",
                    )
                )

            for source in records[start + len(batch) :]:
                results.append(
                    _report_row(
                        source,
                        "not_submitted",
                        "Not submitted because an earlier batch failed.",
                    )
                )

            _save_report(results, report_path)

            raise ValueError(
                "Inventory loading stopped. Some rows may have been "
                f"processed by the API. Review {report_path} before retrying."
            ) from exc

    return {
        "submitted_rows": len(records),
        "imported": sum(r["status"] == "imported" for r in results),
        "conflicts": sum(r["status"] == "conflict" for r in results),
        "outcome_unknown": sum(
            r["status"] == "outcome_unknown" for r in results
        ),
        "not_submitted": sum(
            r["status"] == "not_submitted" for r in results
        ),
        "report_file": str(report_path),
    }
