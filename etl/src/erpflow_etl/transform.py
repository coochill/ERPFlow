import pandas as pd

COLUMN_ALIASES = {
    "sku": "sku",
    "item sku": "sku",
    "product sku": "sku",
    "item name": "name",
    "product name": "name",
    "name": "name",
    "quantity": "quantity",
    "stock quantity": "quantity",
    "reorder level": "reorder_level",
    "unit price": "unit_price",
    "price": "unit_price",
    "unit": "unit",
    "description": "description",
}


def transform_inventory(data: pd.DataFrame) -> pd.DataFrame:
    """Normalize inventory column names and trim text fields."""
    result = data.copy()

    normalized_columns = {
        column: " ".join(str(column).strip().lower().split())
        for column in result.columns
    }

    result = result.rename(columns=normalized_columns)

    mapped_columns = {
        column: COLUMN_ALIASES[column]
        for column in result.columns
        if column in COLUMN_ALIASES
    }

    result = result.rename(columns=mapped_columns)

    if result.columns.duplicated().any():
        duplicates = result.columns[result.columns.duplicated()].tolist()
        raise ValueError(
            f"Multiple input columns map to the same field: {duplicates}"
        )

    for column in ("sku", "name", "unit", "description"):
        if column in result.columns:
            result[column] = result[column].map(
                lambda value: value.strip()
                if isinstance(value, str)
                else value
            )

    if "sku" in result.columns:
        result["sku"] = result["sku"].map(
            lambda value: value.upper()
            if isinstance(value, str)
            else value
        )

    return result
