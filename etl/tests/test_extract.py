import pandas as pd
import pytest

from erpflow_etl.extract import extract_file


def test_extract_csv(tmp_path):
    path = tmp_path / "inventory.csv"
    path.write_text(
        "sku,name,quantity\nSKU-001,Keyboard,10\n",
        encoding="utf-8",
    )

    result = extract_file(path)

    assert list(result.columns) == ["sku", "name", "quantity"]
    assert len(result) == 1
    assert result.iloc[0]["sku"] == "SKU-001"
    assert result.iloc[0]["quantity"] == 10


def test_extract_xlsx(tmp_path):
    path = tmp_path / "inventory.xlsx"

    pd.DataFrame(
        [{"sku": "SKU-002", "name": "Mouse", "quantity": 5}]
    ).to_excel(path, index=False, engine="openpyxl")

    result = extract_file(path)

    assert len(result) == 1
    assert result.iloc[0]["sku"] == "SKU-002"
    assert result.iloc[0]["quantity"] == 5


def test_extract_missing_file():
    with pytest.raises(FileNotFoundError):
        extract_file("missing_inventory.csv")


def test_extract_unsupported_file(tmp_path):
    path = tmp_path / "inventory.json"
    path.write_text("{}", encoding="utf-8")

    with pytest.raises(ValueError, match="Unsupported file type"):
        extract_file(path)
