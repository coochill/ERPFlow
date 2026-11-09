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


def _supplier_page_response(body: Any) -> dict[str, Any]:
    if not isinstance(body, dict) or not isinstance(body.get("data"), list):
        raise ValueError("ERP API returned an invalid supplier page.")
    return body


async def get_suppliers(page: int = 1) -> dict[str, Any]:
    """Retrieve one read-only, Laravel-paginated page of suppliers."""
    _validate_positive(page, "page")
    async with _api_client() as client:
        response = await client.get("/suppliers", params={"page": page})
    return _supplier_page_response(response)


async def get_supplier_details(supplier_id: int) -> dict[str, Any]:
    """Retrieve read-only details for one supplier by numeric ID."""
    _validate_positive(supplier_id, "supplier_id")
    async with _api_client() as client:
        try:
            response = await client.get(f"/suppliers/{supplier_id}")
        except ERPHTTPError as error:
            if error.status_code == 404:
                return {
                    "found": False,
                    "supplier_id": supplier_id,
                    "message": "Supplier not found.",
                }
            raise

    if (
        not isinstance(response, dict)
        or not isinstance(response.get("data"), dict)
    ):
        raise ValueError("ERP API returned an invalid supplier response.")
    return {"found": True, "supplier": response["data"]}
