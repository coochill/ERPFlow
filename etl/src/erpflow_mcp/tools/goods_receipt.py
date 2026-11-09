from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from erpflow_mcp.api_client import ERPAPIClient, ERPHTTPError
from erpflow_mcp.config import MCPSettings


def _validate_positive(value: int, name: str) -> None:
    if value < 1:
        raise ValueError(f"{name} must be greater than zero.")


@asynccontextmanager
async def _api_client() -> AsyncIterator[ERPAPIClient]:
    async with ERPAPIClient(MCPSettings.from_env()) as client:
        yield client


def _goods_receipt_page_response(body: Any) -> dict[str, Any]:
    if not isinstance(body, dict) or not isinstance(body.get("data"), list):
        raise ValueError("ERP API returned an invalid goods receipt page.")
    return body


async def get_goods_receipts(page: int = 1) -> dict[str, Any]:
    """Retrieve one read-only, Laravel-paginated goods receipt page."""
    _validate_positive(page, "page")
    async with _api_client() as client:
        response = await client.get(
            "/goods-receipts",
            params={"page": page},
        )
    return _goods_receipt_page_response(response)


async def get_goods_receipt_details(goods_receipt_id: int) -> dict[str, Any]:
    """Retrieve one receipt with its purchase request, supplier, and lines."""
    _validate_positive(goods_receipt_id, "goods_receipt_id")
    async with _api_client() as client:
        try:
            response = await client.get(
                f"/goods-receipts/{goods_receipt_id}"
            )
        except ERPHTTPError as error:
            if error.status_code == 404:
                return {
                    "found": False,
                    "goods_receipt_id": goods_receipt_id,
                    "message": "Goods receipt not found.",
                }
            raise

    if (
        not isinstance(response, dict)
        or not isinstance(response.get("data"), dict)
    ):
        raise ValueError("ERP API returned an invalid goods receipt response.")
    return {"found": True, "goods_receipt": response["data"]}
