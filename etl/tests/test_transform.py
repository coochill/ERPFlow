import pandas as pd
import pytest

from erpflow_etl.transform import transform_inventory


def test_transform_normalizes_columns_and_text():
    source = pd.DataFrame(
        [{
            " SKU ": " sku-001 ",
            "Item Name": " Wireless Mouse ",
            "Stock Quantity": 10,
            "Unit Price": 499.50,
        }]
    )

    result = transform_inventory(source)

    assert result.loc[0, "sku"] == "SKU-001"
    assert result.loc[0, "name"] == "Wireless Mouse"
    assert result.loc[0, "quantity"] == 10
    assert result.loc[0, "unit_price"] == 499.50


def test_transform_does_not_modify_source():
    source = pd.DataFrame([{
        "SKU": " sku-001 ",
        "Item Name": " Mouse ",
    }])

    original = source.copy(deep=True)

    transform_inventory(source)

    pd.testing.assert_frame_equal(source, original)


def test_transform_rejects_duplicate_mapped_columns():
    source = pd.DataFrame(
        [["SKU-001", "SKU-002"]],
        columns=["SKU", "Item SKU"],
    )

    with pytest.raises(ValueError, match="map to the same field"):
        transform_inventory(source)
