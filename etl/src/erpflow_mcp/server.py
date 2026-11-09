from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
import logging
from typing import Any

from mcp.server import MCPServer

from erpflow_mcp.config import ServiceTokenMiddleware
from erpflow_mcp.tools.inventory import (
    get_inventory_item,
    get_inventory_items,
    get_inventory_movements,
    get_low_stock_items,
)
from erpflow_mcp.tools.supplier import (
    get_supplier_details,
    get_suppliers,
)
from erpflow_mcp.tools.purchase_request import (
    get_purchase_request_details,
    get_purchase_requests,
)
from erpflow_mcp.tools.goods_receipt import (
    get_goods_receipt_details,
    get_goods_receipts,
)


logger = logging.getLogger(__name__)


mcp_server = MCPServer(
    name="ERPFlow",
    title="ERPFlow MCP Server",
    description="MCP server for ERPFlow inventory and business operations.",
    version="0.1.0",
    instructions=(
        "ERPFlow provides tools for accessing inventory and business "
        "operations data."
    ),
)


mcp_server.tool(
    name="get_inventory_items",
    description="Retrieve a page of read-only inventory items from ERPFlow.",
)(get_inventory_items)
mcp_server.tool(
    name="get_inventory_item",
    description="Retrieve read-only details for one ERPFlow inventory item.",
)(get_inventory_item)
mcp_server.tool(
    name="get_low_stock_items",
    description=(
        "Retrieve inventory items whose quantity is at or below their "
        "Laravel-defined reorder_level."
    ),
)(get_low_stock_items)
mcp_server.tool(
    name="get_inventory_movements",
    description=(
        "Retrieve read-only inventory movement history, optionally filtered "
        "by item ID and movement type."
    ),
)(get_inventory_movements)
mcp_server.tool(
    name="get_suppliers",
    description="Retrieve a page of read-only suppliers from ERPFlow.",
)(get_suppliers)
mcp_server.tool(
    name="get_supplier_details",
    description="Retrieve read-only details for one ERPFlow supplier.",
)(get_supplier_details)
mcp_server.tool(
    name="get_purchase_requests",
    description=(
        "Retrieve a page of read-only purchase requests, including their "
        "supplier and line-item data returned by Laravel."
    ),
)(get_purchase_requests)
mcp_server.tool(
    name="get_purchase_request_details",
    description=(
        "Retrieve read-only details for one purchase request, including its "
        "supplier and associated line items."
    ),
)(get_purchase_request_details)
mcp_server.tool(
    name="get_goods_receipts",
    description=(
        "Retrieve a page of read-only goods receipts, including related "
        "purchase request, supplier, and receipt line data."
    ),
)(get_goods_receipts)
mcp_server.tool(
    name="get_goods_receipt_details",
    description=(
        "Retrieve read-only details for one goods receipt, including its "
        "purchase request, supplier, and receipt line items."
    ),
)(get_goods_receipt_details)


class _MCPTransportProxy:
    """Delegate requests to the transport app for the current lifespan."""

    def __init__(self, app: Any):
        self._app = app

    def replace(self, app: Any) -> None:
        self._app = app

    async def __call__(self, scope, receive, send):
        await self._app(scope, receive, send)


_mcp_transport_proxy = _MCPTransportProxy(
    mcp_server.streamable_http_app(
        streamable_http_path="/mcp",
        stateless_http=False,
    )
)
mcp_app = ServiceTokenMiddleware(_mcp_transport_proxy)
_lifespan_count = 0


@asynccontextmanager
async def mcp_lifespan(app) -> AsyncIterator[None]:
    """Manage MCP session lifecycle."""

    global _lifespan_count
    if _lifespan_count:
        _mcp_transport_proxy.replace(
            mcp_server.streamable_http_app(
                streamable_http_path="/mcp",
                stateless_http=False,
            )
        )
    _lifespan_count += 1
    session_manager = mcp_server.session_manager
    logger.info("Starting ERPFlow MCP server with Streamable HTTP transport.")
    async with session_manager.run():
        yield
    logger.info("Stopped ERPFlow MCP server.")