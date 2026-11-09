from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any, Literal

from erpflow_mcp.api_client import ERPAPIClient, ERPHTTPError
from erpflow_mcp.config import MCPSettings


MovementType = Literal["in", "out"]


def _validate_positive(value: int, name: str) -> None:
    if value < 1:
        raise ValueError(f"{name} must be greater than zero.")


def _validate_page(page: int) -> None:
    _validate_positive(page, "page")


@asynccontextmanager
async def _api_client() -> AsyncIterator[ERPAPIClient]:
    async with ERPAPIClient(MCPSettings.from_env()) as client:
        yield client


def _page_response(body: Any) -> dict[str, Any]:
    if not isinstance(body, dict) or not isinstance(body.get("data"), list):
        raise ValueError("ERP API returned an invalid inventory page.")
    return body


async def _get_inventory_page(
    client: ERPAPIClient,
    *,
    page: int,
) -> dict[str, Any]:
    return _page_response(await client.get("/items", params={"page": page}))


async def _get_movements_page(
    client: ERPAPIClient,
    item_id: int,
    *,
    page: int,
) -> dict[str, Any]:
    return _page_response(
        await client.get(
            f"/items/{item_id}/movements",
            params={"page": page},
        )
    )


async def _all_inventory_items(client: ERPAPIClient) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    async for page in client.get_paginated("/items"):
        page_data = _page_response(page)
        items.extend(
            item for item in page_data["data"] if isinstance(item, dict)
        )
    return items


async def _item_movements(
    client: ERPAPIClient,
    item_id: int,
    *,
    page: int,
) -> dict[str, Any]:
    return await _get_movements_page(client, item_id, page=page)


async def get_inventory_items(page: int = 1) -> dict[str, Any]:
    """Retrieve a page of inventory items from ERPFlow."""
    _validate_page(page)
    async with _api_client() as client:
        return await _get_inventory_page(client, page=page)


async def get_inventory_item(item_id: int) -> dict[str, Any]:
    """Retrieve one inventory item by its numeric ID."""
    _validate_positive(item_id, "item_id")
    async with _api_client() as client:
        try:
            item = await client.get(f"/items/{item_id}")
        except ERPHTTPError as error:
            if error.status_code == 404:
                return {
                    "found": False,
                    "item_id": item_id,
                    "message": "Inventory item not found.",
                }
            raise

        if not isinstance(item, dict):
            raise ValueError("ERP API returned an invalid inventory item.")
        return {"found": True, "item": item}


async def get_low_stock_items() -> dict[str, Any]:
    """Retrieve items whose quantity is at or below reorder_level."""
    async with _api_client() as client:
        items = await _all_inventory_items(client)

    low_stock = [
        item
        for item in items
        if isinstance(item.get("quantity"), int)
        and isinstance(item.get("reorder_level"), int)
        and item["quantity"] <= item["reorder_level"]
    ]
    return {"count": len(low_stock), "items": low_stock}


async def get_inventory_movements(
    item_id: int | None = None,
    movement_type: MovementType | None = None,
    page: int = 1,
) -> dict[str, Any]:
    """Retrieve inventory movements, optionally filtered by item and type."""
    if item_id is not None:
        _validate_positive(item_id, "item_id")
    _validate_page(page)
    if movement_type not in {None, "in", "out"}:
        raise ValueError("movement_type must be 'in' or 'out'.")

    async with _api_client() as client:
        if item_id is not None:
            item_ids = [item_id]
        else:
            item_ids = [
                item["id"]
                for item in await _all_inventory_items(client)
                if isinstance(item.get("id"), int)
            ]

        movements: list[dict[str, Any]] = []
        pages: list[dict[str, Any]] = []
        for current_item_id in item_ids:
            response = await _item_movements(
                client,
                current_item_id,
                page=page,
            )
            pages.append(response)
            movements.extend(
                movement
                for movement in response["data"]
                if isinstance(movement, dict)
                and (
                    movement_type is None
                    or movement.get("type") == movement_type
                )
            )

    result: dict[str, Any] = {
        "count": len(movements),
        "movements": movements,
        "page": page,
    }
    if item_id is not None and pages:
        for key in ("current_page", "last_page", "per_page", "total"):
            if key in pages[0]:
                result[key] = pages[0][key]
    return result
