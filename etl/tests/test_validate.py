import pandas as pd
import pytest

from erpflow_etl.validate import validate_inventory


def test_validate_separates_valid_and_invalid_rows():
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
            "quantity": -1,
            "unit_price": 250,
        },
    ])

    valid, invalid = validate_inventory(data)

    assert len(valid) == 1
    assert valid.iloc[0]["sku"] == "SKU-001"
    assert len(invalid) == 1
    assert "quantity must be a nonnegative whole number" in (
        invalid.iloc[0]["validation_errors"]
    )


def test_validate_rejects_all_rows_with_duplicate_skus():
    data = pd.DataFrame([
        {
            "sku": "SKU-001",
            "name": "Keyboard",
            "quantity": 10,
            "unit_price": 500,
        },
        {
            "sku": "sku-001",
            "name": "Another Keyboard",
            "quantity": 5,
            "unit_price": 450,
        },
    ])

    valid, invalid = validate_inventory(data)

    assert valid.empty
    assert len(invalid) == 2
    assert invalid["validation_errors"].str.contains(
        "duplicate SKU"
    ).all()


def test_validate_rejects_invalid_price_and_missing_name():
    data = pd.DataFrame([
        {
            "sku": "SKU-001",
            "name": " ",
            "quantity": 2,
            "unit_price": -5,
        },
    ])

    valid, invalid = validate_inventory(data)

    assert valid.empty
    assert len(invalid) == 1
    errors = invalid.iloc[0]["validation_errors"]
    assert "name is required" in errors
    assert "unit_price must be a nonnegative number" in errors


def test_validate_requires_expected_columns():
    data = pd.DataFrame([{"sku": "SKU-001", "name": "Keyboard"}])

    with pytest.raises(ValueError, match="Missing required columns"):
        validate_inventory(data)
