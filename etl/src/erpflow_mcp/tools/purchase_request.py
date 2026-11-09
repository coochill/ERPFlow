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


def _purchase_request_page_response(body: Any) -> dict[str, Any]:
    if not isinstance(body, dict) or not isinstance(body.get("data"), list):
        raise ValueError("ERP API returned an invalid purchase request page.")
    return body


async def get_purchase_requests(page: int = 1) -> dict[str, Any]:
    """Retrieve one read-only, Laravel-paginated purchase request page."""
    _validate_positive(page, "page")
    async with _api_client() as client:
        response = await client.get(
            "/purchase-requests",
            params={"page": page},
        )
    return _purchase_request_page_response(response)


async def get_purchase_request_details(
    purchase_request_id: int,
) -> dict[str, Any]:
    """Retrieve one purchase request with its supplier and line items."""
    _validate_positive(purchase_request_id, "purchase_request_id")
    async with _api_client() as client:
        try:
            response = await client.get(
                f"/purchase-requests/{purchase_request_id}"
            )
        except ERPHTTPError as error:
            if error.status_code == 404:
                return {
                    "found": False,
                    "purchase_request_id": purchase_request_id,
                    "message": "Purchase request not found.",
                }
            raise

    if (
        not isinstance(response, dict)
        or not isinstance(response.get("data"), dict)
    ):
        raise ValueError(
            "ERP API returned an invalid purchase request response."
        )
    return {"found": True, "purchase_request": response["data"]}
