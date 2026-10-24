import pandas as pd

from erpflow_etl.pipeline import run_pipeline


def test_pipeline_writes_valid_invalid_and_summary_reports(tmp_path):
    input_path = tmp_path / "inventory.csv"
    output_dir = tmp_path / "reports"

    pd.DataFrame([
        {
            "SKU": "SKU-001",
            "Item Name": "Keyboard",
            "Quantity": 10,
            "Unit Price": 500,
        },
        {
            "SKU": "SKU-002",
            "Item Name": "Mouse",
            "Quantity": -2,
            "Unit Price": 250,
        },
    ]).to_csv(input_path, index=False)

    result = run_pipeline(input_path, output_dir)

    assert result["total_rows"] == 2
    assert result["valid_rows"] == 1
    assert result["invalid_rows"] == 1

    valid = pd.read_csv(output_dir / "valid_inventory.csv")
    invalid = pd.read_csv(output_dir / "invalid_inventory.csv")
    summary = pd.read_csv(output_dir / "import_summary.csv")

    assert valid.iloc[0]["sku"] == "SKU-001"
    assert invalid.iloc[0]["sku"] == "SKU-002"
    assert "quantity must be a nonnegative whole number" in (
        invalid.iloc[0]["validation_errors"]
    )
    assert summary.iloc[0]["total_rows"] == 2
    assert summary.iloc[0]["status"] == "validation_errors"
