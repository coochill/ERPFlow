from pathlib import Path
import pandas as pd

from erpflow_etl.extract import extract_file
from erpflow_etl.transform import transform_inventory
from erpflow_etl.validate import validate_inventory
from erpflow_etl.load import load_inventory


def run_pipeline(
    input_path: str | Path,
    output_dir: str | Path,
    *,
    load_to_api: bool = False,
    api_base_url: str | None = None,
    api_token: str | None = None,
    batch_size: int = 500,
) -> dict:
    """Extract, transform, validate, and optionally load inventory rows."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    extracted = extract_file(input_path)
    transformed = transform_inventory(extracted)
    valid, invalid = validate_inventory(transformed)

    valid_path = output_path / "valid_inventory.csv"
    invalid_path = output_path / "invalid_inventory.csv"
    summary_path = output_path / "import_summary.csv"

    valid.to_csv(valid_path, index=False)
    invalid.to_csv(invalid_path, index=False)

    summary = pd.DataFrame([{
        "source_file": Path(input_path).name,
        "total_rows": len(extracted),
        "valid_rows": len(valid),
        "invalid_rows": len(invalid),
        "status": "validated" if invalid.empty else "validation_errors",
    }])
    summary.to_csv(summary_path, index=False)

    result = {
        "total_rows": len(extracted),
        "valid_rows": len(valid),
        "invalid_rows": len(invalid),
        "valid_file": str(valid_path),
        "invalid_file": str(invalid_path),
        "summary_file": str(summary_path),
        "load": None,
    }

    if load_to_api:
        if not api_base_url:
            raise ValueError(
                "api_base_url is required when load_to_api=True."
            )

        result["load"] = load_inventory(
            valid_rows=valid,
            output_dir=output_path,
            api_base_url=api_base_url,
            api_token=api_token,
            batch_size=batch_size,
        )

    return result
