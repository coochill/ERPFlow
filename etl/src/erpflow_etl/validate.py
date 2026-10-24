from decimal import Decimal, InvalidOperation

import pandas as pd


REQUIRED_COLUMNS = {"sku", "name", "quantity", "unit_price"}


def _is_nonnegative_integer(value: object) -> bool:
    if pd.isna(value) or isinstance(value, bool):
        return False

    try:
        number = Decimal(str(value).strip())
    except (InvalidOperation, ValueError, TypeError):
        return False

    return (
        number.is_finite()
        and number >= 0
        and number == number.to_integral_value()
    )


def _is_nonnegative_price(value: object) -> bool:
    if pd.isna(value) or isinstance(value, bool):
        return False

    try:
        number = Decimal(str(value).strip())
    except (InvalidOperation, ValueError, TypeError):
        return False

    return number.is_finite() and number >= 0


def validate_inventory(data: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return (valid_rows, invalid_rows) with validation errors."""
    missing_columns = REQUIRED_COLUMNS - set(data.columns)

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {sorted(missing_columns)}"
        )

    result = data.copy()
    errors: list[list[str]] = [[] for _ in range(len(result))]

    for position, (_, row) in enumerate(result.iterrows()):
        for column in ("sku", "name"):
            value = row[column]
            if pd.isna(value) or not str(value).strip():
                errors[position].append(f"{column} is required")

        if not _is_nonnegative_integer(row["quantity"]):
            errors[position].append(
                "quantity must be a nonnegative whole number"
            )

        if not _is_nonnegative_price(row["unit_price"]):
            errors[position].append(
                "unit_price must be a nonnegative number"
            )

    # Reject every row involved in a duplicate SKU.
    sku_values = result["sku"].map(
        lambda value: value.strip().upper()
        if isinstance(value, str)
        else ""
    )
    nonempty_skus = sku_values[sku_values != ""]
    duplicate_skus = set(
        nonempty_skus[nonempty_skus.duplicated(keep=False)].tolist()
    )

    for position, sku in enumerate(sku_values.tolist()):
        if sku in duplicate_skus:
            errors[position].append(f"duplicate SKU: {sku}")

    result["validation_errors"] = errors

    valid_mask = result["validation_errors"].map(len).eq(0)

    valid_rows = result.loc[valid_mask].drop(
        columns=["validation_errors"]
    ).copy()

    invalid_rows = result.loc[~valid_mask].copy()
    invalid_rows["validation_errors"] = invalid_rows[
        "validation_errors"
    ].map(lambda messages: "; ".join(messages))

    return valid_rows, invalid_rows
