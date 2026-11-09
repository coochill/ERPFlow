import httpx
import pytest
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

from erpflow_mcp.api_client import (
    ERPAPIClient,
    ERPAPIError,
    ERPAuthenticationError,
    ERPHTTPError,
    ERPInvalidResponseError,
)
from erpflow_mcp.config import MCPSettings, ServiceTokenMiddleware
from erpflow_mcp.server import mcp_app, mcp_lifespan, mcp_server
from erpflow_mcp.tools import goods_receipt
from erpflow_mcp.tools import inventory
from erpflow_mcp.tools import purchase_request
from erpflow_mcp.tools import supplier


@pytest.fixture
def anyio_backend():
    return "asyncio"


def settings(**overrides):
    values = {
        "transport": "streamable-http",
        "host": "127.0.0.1",
        "port": 8000,
        "erp_api_base_url": "https://erp.example.test/api",
        "erp_api_token": "secret-token",
        "request_timeout": 2.5,
        "connect_timeout": 1.0,
    }
    values.update(overrides)
    return MCPSettings(**values)


def test_mcp_server_is_initialized():
    assert mcp_server.name == "ERPFlow"
    assert mcp_app is not None


@pytest.mark.anyio
async def test_mcp_http_requires_service_token(monkeypatch):
    monkeypatch.delenv("ETL_SERVICE_TOKEN", raising=False)
    transport = httpx.ASGITransport(app=mcp_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        response = await client.get("/mcp")

    assert response.status_code == 503
    assert "authentication is not configured" in response.text


@pytest.mark.anyio
async def test_mcp_http_rejects_invalid_service_token(monkeypatch):
    expected_token = "service-" + "secret"
    monkeypatch.setenv("ETL_SERVICE_TOKEN", expected_token)
    transport = httpx.ASGITransport(app=mcp_app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        response = await client.get(
            "/mcp",
            headers={"Authorization": "Bearer wrong-" + "token"},
        )

    assert response.status_code == 401
    assert "Invalid or missing service token" in response.text
    assert expected_token not in response.text


@pytest.mark.anyio
async def test_mcp_http_passes_valid_service_token_to_transport(monkeypatch):
    expected_token = "service-" + "secret"
    monkeypatch.setenv("ETL_SERVICE_TOKEN", expected_token)
    async def downstream(scope, receive, send):
        await send(
            {
                "type": "http.response.start",
                "status": 204,
                "headers": [],
            }
        )
        await send(
            {
                "type": "http.response.body",
                "body": b"",
            }
        )

    transport = httpx.ASGITransport(
        app=ServiceTokenMiddleware(downstream)
    )
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:
        response = await client.get(
            "/mcp",
            headers={"Authorization": "Bearer " + expected_token},
        )

    assert response.status_code == 204
    assert expected_token not in response.text


@pytest.mark.anyio
async def test_mcp_lifespan_can_start_and_stop_repeatedly():
    async with mcp_lifespan(None):
        assert mcp_server.session_manager is not None
    async with mcp_lifespan(None):
        assert mcp_server.session_manager is not None


@pytest.mark.anyio
async def test_mcp_sdk_client_discovers_and_invokes_over_streamable_http(
    monkeypatch,
    fake_inventory_client,
):
    fake_inventory_client.responses["/items"] = {
        "data": [{"id": 4, "name": "Keyboard"}],
        "current_page": 1,
        "last_page": 1,
    }
    monkeypatch.setenv("ETL_SERVICE_TOKEN", "integration-token")

    async with mcp_lifespan(None):
        transport = httpx.ASGITransport(app=mcp_app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://127.0.0.1:8000",
            headers={"Authorization": "Bearer integration-token"},
        ) as http_client:
            async with streamable_http_client(
                "http://127.0.0.1:8000/mcp",
                http_client=http_client,
            ) as streams:
                async with ClientSession(*streams) as session:
                    await session.initialize()
                    listing = await session.list_tools()
                    result = await session.call_tool(
                        "get_inventory_items",
                        {"page": 1},
                    )

    assert len(listing.tools) == 10
    assert result.is_error is False
    assert result.structured_content["data"][0]["id"] == 4
    assert fake_inventory_client.calls == [
        ("/items", {"params": {"page": 1}})
    ]


@pytest.mark.anyio
async def test_inventory_tools_are_registered_with_valid_schemas():
    tools = await mcp_server.list_tools()

    assert {
        tool.name
        for tool in tools
    } >= {
        "get_inventory_items",
        "get_inventory_item",
        "get_low_stock_items",
        "get_inventory_movements",
    }

    movement_tool = next(
        tool for tool in tools if tool.name == "get_inventory_movements"
    )
    assert "item_id" in movement_tool.input_schema["properties"]
    assert "movement_type" in movement_tool.input_schema["properties"]


@pytest.mark.anyio
async def test_all_read_only_tools_are_discoverable_with_schemas():
    tools = await mcp_server.list_tools()
    expected = {
        "get_inventory_items": {"page"},
        "get_inventory_item": {"item_id"},
        "get_low_stock_items": set(),
        "get_inventory_movements": {"item_id", "movement_type", "page"},
        "get_suppliers": {"page"},
        "get_supplier_details": {"supplier_id"},
        "get_purchase_requests": {"page"},
        "get_purchase_request_details": {"purchase_request_id"},
        "get_goods_receipts": {"page"},
        "get_goods_receipt_details": {"goods_receipt_id"},
    }

    discovered = {tool.name: tool for tool in tools}
    assert set(discovered) == set(expected)
    for name, properties in expected.items():
        schema = discovered[name].input_schema
        assert set(schema["properties"]) == properties
        assert schema["type"] == "object"
        assert discovered[name].description

    assert "required" not in discovered["get_inventory_items"].input_schema
    assert (
        discovered["get_inventory_items"].input_schema["properties"]["page"][
            "default"
        ]
        == 1
    )


@pytest.mark.anyio
async def test_supplier_tools_are_registered_with_valid_schemas():
    tools = await mcp_server.list_tools()

    assert {
        tool.name
        for tool in tools
    } >= {"get_suppliers", "get_supplier_details"}

    suppliers_tool = next(
        tool for tool in tools if tool.name == "get_suppliers"
    )
    details_tool = next(
        tool for tool in tools if tool.name == "get_supplier_details"
    )
    assert "page" in suppliers_tool.input_schema["properties"]
    assert "supplier_id" in details_tool.input_schema["properties"]


@pytest.mark.anyio
async def test_purchase_request_tools_are_registered_with_valid_schemas():
    tools = await mcp_server.list_tools()

    assert {
        tool.name
        for tool in tools
    } >= {"get_purchase_requests", "get_purchase_request_details"}

    listing_tool = next(
        tool for tool in tools if tool.name == "get_purchase_requests"
    )
    details_tool = next(
        tool
        for tool in tools
        if tool.name == "get_purchase_request_details"
    )
    assert "page" in listing_tool.input_schema["properties"]
    assert (
        "purchase_request_id"
        in details_tool.input_schema["properties"]
    )


@pytest.mark.anyio
async def test_goods_receipt_tools_are_registered_with_valid_schemas():
    tools = await mcp_server.list_tools()

    assert {
        tool.name
        for tool in tools
    } >= {"get_goods_receipts", "get_goods_receipt_details"}

    listing_tool = next(
        tool for tool in tools if tool.name == "get_goods_receipts"
    )
    details_tool = next(
        tool
        for tool in tools
        if tool.name == "get_goods_receipt_details"
    )
    assert "page" in listing_tool.input_schema["properties"]
    assert (
        "goods_receipt_id"
        in details_tool.input_schema["properties"]
    )


def test_mcp_settings_load_from_environment(monkeypatch):
    monkeypatch.setenv("MCP_TRANSPORT", "streamable-http")
    monkeypatch.setenv("MCP_HOST", "127.0.0.1")
    monkeypatch.setenv("MCP_PORT", "9000")
    monkeypatch.setenv("ERP_API_BASE_URL", "http://nginx/api/")
    monkeypatch.setenv("ERP_API_TOKEN", "token")
    monkeypatch.setenv("ERP_API_TIMEOUT", "4.5")
    monkeypatch.setenv("ERP_API_CONNECT_TIMEOUT", "1.5")

    loaded = MCPSettings.from_env()

    assert loaded.port == 9000
    assert loaded.erp_api_base_url == "http://nginx/api"
    assert loaded.request_timeout == 4.5
    assert loaded.connect_timeout == 1.5


def test_mcp_settings_reject_invalid_transport(monkeypatch):
    monkeypatch.setenv("MCP_TRANSPORT", "sse")
    monkeypatch.setenv("ERP_API_BASE_URL", "http://nginx/api")

    with pytest.raises(ValueError, match="MCP_TRANSPORT"):
        MCPSettings.from_env()


@pytest.mark.anyio
async def test_api_client_initialization_and_successful_request():
    def handler(request):
        assert request.headers["Authorization"] == "Bearer secret-token"
        return httpx.Response(200, json={"data": [{"id": 1}]})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(
        base_url="https://erp.example.test/api", transport=transport
    ) as http_client:
        async with ERPAPIClient(settings(), http_client) as client:
            assert await client.get("/items") == {"data": [{"id": 1}]}


@pytest.mark.anyio
async def test_api_client_does_not_expose_token_in_errors_or_logs(caplog):
    transport = httpx.MockTransport(
        lambda request: httpx.Response(500, json={"message": "failed"})
    )
    async with httpx.AsyncClient(
        transport=transport,
        base_url="https://erp.example.test/api",
    ) as http_client:
        client = ERPAPIClient(settings(), http_client)
        with pytest.raises(ERPHTTPError) as error:
            await client.get("/items")

    assert "secret-token" not in str(error.value)
    assert "secret-token" not in caplog.text


@pytest.mark.anyio
@pytest.mark.parametrize("status_code", [401, 403])
async def test_api_client_handles_authentication_failures(status_code):
    transport = httpx.MockTransport(
        lambda request: httpx.Response(status_code, json={"message": "no"})
    )
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = ERPAPIClient(settings(), http_client)
        with pytest.raises(ERPAuthenticationError):
            await client.get("https://erp.example.test/items")


@pytest.mark.anyio
async def test_api_client_handles_http_errors():
    transport = httpx.MockTransport(
        lambda request: httpx.Response(422, json={"message": "invalid"})
    )
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = ERPAPIClient(settings(), http_client)
        with pytest.raises(ERPHTTPError) as error:
            await client.get("https://erp.example.test/items")
        assert error.value.status_code == 422


@pytest.mark.anyio
async def test_api_client_handles_timeouts():
    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = ERPAPIClient(settings(), http_client)
        with pytest.raises(ERPAPIError, match="timed out"):
            await client.get("https://erp.example.test/items")


@pytest.mark.anyio
async def test_api_client_rejects_invalid_json():
    transport = httpx.MockTransport(
        lambda request: httpx.Response(200, content=b"not-json")
    )
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = ERPAPIClient(settings(), http_client)
        with pytest.raises(ERPInvalidResponseError):
            await client.get("https://erp.example.test/items")


@pytest.mark.anyio
async def test_api_client_supports_laravel_pagination():
    responses = [
        {"data": [{"id": 1}], "current_page": 1, "last_page": 2},
        {"data": [{"id": 2}], "current_page": 2, "last_page": 2},
    ]

    def handler(request):
        return httpx.Response(200, json=responses[int(request.url.params["page"]) - 1])

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(
        base_url="https://erp.example.test", transport=transport
    ) as http_client:
        client = ERPAPIClient(settings(), http_client)
        pages = [page async for page in client.get_paginated("/items")]

    assert [page["data"][0]["id"] for page in pages] == [1, 2]


class FakeInventoryClient:
    def __init__(self, responses, pages=None):
        self.responses = responses
        self.pages = pages or []
        self.calls = []

    async def get(self, path, **kwargs):
        self.calls.append((path, kwargs))
        return self.responses[path]

    async def get_paginated(self, path):
        self.calls.append((path, {"paginated": True}))
        for page in self.pages:
            yield page


class FakeSupplierClient:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    async def get(self, path, **kwargs):
        self.calls.append((path, kwargs))
        response = self.responses[path]
        if isinstance(response, Exception):
            raise response
        return response


class FakePurchaseRequestClient:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    async def get(self, path, **kwargs):
        self.calls.append((path, kwargs))
        response = self.responses[path]
        if isinstance(response, Exception):
            raise response
        return response


class FakeGoodsReceiptClient:
    def __init__(self, responses):
        self.responses = responses
        self.calls = []

    async def get(self, path, **kwargs):
        self.calls.append((path, kwargs))
        response = self.responses[path]
        if isinstance(response, Exception):
            raise response
        return response


@pytest.fixture
def fake_inventory_client(monkeypatch):
    client = FakeInventoryClient({})

    class ClientContext:
        async def __aenter__(self):
            return client

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

    monkeypatch.setattr(inventory, "_api_client", lambda: ClientContext())
    return client


@pytest.fixture
def fake_supplier_client(monkeypatch):
    client = FakeSupplierClient({})

    class ClientContext:
        async def __aenter__(self):
            return client

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

    monkeypatch.setattr(supplier, "_api_client", lambda: ClientContext())
    return client


@pytest.fixture
def fake_purchase_request_client(monkeypatch):
    client = FakePurchaseRequestClient({})

    class ClientContext:
        async def __aenter__(self):
            return client

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

    monkeypatch.setattr(
        purchase_request,
        "_api_client",
        lambda: ClientContext(),
    )
    return client


@pytest.fixture
def fake_goods_receipt_client(monkeypatch):
    client = FakeGoodsReceiptClient({})

    class ClientContext:
        async def __aenter__(self):
            return client

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

    monkeypatch.setattr(
        goods_receipt,
        "_api_client",
        lambda: ClientContext(),
    )
    return client


@pytest.mark.anyio
async def test_mcp_call_tool_invokes_registered_laravel_backed_tool(
    fake_goods_receipt_client,
):
    fake_goods_receipt_client.responses["/goods-receipts"] = {
        "data": [{"id": 6, "receipt_number": "GR-6"}],
        "current_page": 1,
        "last_page": 1,
    }

    result = await mcp_server.call_tool(
        "get_goods_receipts",
        {"page": 1},
    )

    assert result.is_error is False
    assert result.structured_content["data"][0]["id"] == 6
    assert fake_goods_receipt_client.calls == [
        ("/goods-receipts", {"params": {"page": 1}})
    ]


@pytest.mark.anyio
async def test_get_inventory_items_supports_page_and_empty_results(
    fake_inventory_client,
):
    fake_inventory_client.responses["/items"] = {
        "data": [],
        "current_page": 2,
        "last_page": 2,
    }

    result = await inventory.get_inventory_items(page=2)

    assert result["data"] == []
    assert fake_inventory_client.calls == [
        ("/items", {"params": {"page": 2}})
    ]


@pytest.mark.anyio
async def test_get_inventory_item_returns_details(fake_inventory_client):
    fake_inventory_client.responses["/items/7"] = {
        "id": 7,
        "sku": "SKU-7",
        "quantity": 4,
        "reorder_level": 5,
    }

    result = await inventory.get_inventory_item(7)

    assert result == {
        "found": True,
        "item": fake_inventory_client.responses["/items/7"],
    }


@pytest.mark.anyio
async def test_get_inventory_item_handles_not_found(monkeypatch):
    class NotFoundClient:
        async def get(self, path, **kwargs):
            raise ERPHTTPError(404, "ERP API returned HTTP 404.")

    class ClientContext:
        async def __aenter__(self):
            return NotFoundClient()

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

    monkeypatch.setattr(inventory, "_api_client", lambda: ClientContext())

    assert await inventory.get_inventory_item(99) == {
        "found": False,
        "item_id": 99,
        "message": "Inventory item not found.",
    }


@pytest.mark.anyio
async def test_get_low_stock_items_uses_reorder_level(fake_inventory_client):
    fake_inventory_client.pages = [
        {
            "data": [
                {"id": 1, "quantity": 2, "reorder_level": 2},
                {"id": 2, "quantity": 3, "reorder_level": 2},
            ],
            "current_page": 1,
            "last_page": 2,
        },
        {
            "data": [{"id": 3, "quantity": 0, "reorder_level": 1}],
            "current_page": 2,
            "last_page": 2,
        },
    ]

    result = await inventory.get_low_stock_items()

    assert result["count"] == 2
    assert [item["id"] for item in result["items"]] == [1, 3]


@pytest.mark.anyio
async def test_get_inventory_movements_supports_filters_and_pagination(
    fake_inventory_client,
):
    fake_inventory_client.responses["/items/7/movements"] = {
        "data": [
            {"id": 1, "item_id": 7, "type": "in", "quantity": 5},
            {"id": 2, "item_id": 7, "type": "out", "quantity": 2},
        ],
        "current_page": 2,
        "last_page": 3,
        "per_page": 10,
        "total": 25,
    }

    result = await inventory.get_inventory_movements(
        item_id=7,
        movement_type="out",
        page=2,
    )

    assert result["count"] == 1
    assert result["movements"][0]["id"] == 2
    assert result["last_page"] == 3
    assert fake_inventory_client.calls == [
        ("/items/7/movements", {"params": {"page": 2}})
    ]


@pytest.mark.anyio
async def test_get_inventory_movements_without_item_id_aggregates_items(
    fake_inventory_client,
):
    fake_inventory_client.pages = [
        {
            "data": [{"id": 7}, {"id": 8}],
            "current_page": 1,
            "last_page": 1,
        }
    ]
    fake_inventory_client.responses.update(
        {
            "/items/7/movements": {
                "data": [{"id": 1, "item_id": 7, "type": "in"}],
                "current_page": 1,
                "last_page": 1,
            },
            "/items/8/movements": {
                "data": [{"id": 2, "item_id": 8, "type": "out"}],
                "current_page": 1,
                "last_page": 1,
            },
        }
    )

    result = await inventory.get_inventory_movements(movement_type="in")

    assert result["count"] == 1
    assert result["movements"][0]["item_id"] == 7


@pytest.mark.anyio
async def test_inventory_tools_reject_invalid_arguments(fake_inventory_client):
    with pytest.raises(ValueError, match="item_id"):
        await inventory.get_inventory_item(0)
    with pytest.raises(ValueError, match="page"):
        await inventory.get_inventory_items(0)
    with pytest.raises(ValueError, match="movement_type"):
        await inventory.get_inventory_movements(movement_type="adjustment")


@pytest.mark.anyio
async def test_inventory_tool_propagates_authentication_failure(monkeypatch):
    class AuthFailureClient:
        async def get(self, path, **kwargs):
            raise ERPAuthenticationError("ERP API authentication failed.")

    class ClientContext:
        async def __aenter__(self):
            return AuthFailureClient()

        async def __aexit__(self, exc_type, exc_value, traceback):
            return None

    monkeypatch.setattr(inventory, "_api_client", lambda: ClientContext())

    with pytest.raises(ERPAuthenticationError, match="authentication failed"):
        await inventory.get_inventory_items()


@pytest.mark.anyio
async def test_get_suppliers_returns_page_and_supports_pagination(
    fake_supplier_client,
):
    fake_supplier_client.responses["/suppliers"] = {
        "data": [
            {
                "id": 3,
                "name": "Acme Supplies",
                "status": "active",
            }
        ],
        "current_page": 2,
        "last_page": 3,
        "per_page": 15,
        "total": 31,
    }

    result = await supplier.get_suppliers(page=2)

    assert result["data"][0]["name"] == "Acme Supplies"
    assert result["last_page"] == 3
    assert fake_supplier_client.calls == [
        ("/suppliers", {"params": {"page": 2}})
    ]


@pytest.mark.anyio
async def test_get_suppliers_handles_empty_results(fake_supplier_client):
    fake_supplier_client.responses["/suppliers"] = {
        "data": [],
        "current_page": 1,
        "last_page": 1,
    }

    result = await supplier.get_suppliers()

    assert result["data"] == []


@pytest.mark.anyio
async def test_get_supplier_details_returns_supplier(
    fake_supplier_client,
):
    fake_supplier_client.responses["/suppliers/3"] = {
        "data": {
            "id": 3,
            "name": "Acme Supplies",
            "email": "contact@example.test",
            "status": "active",
        }
    }

    result = await supplier.get_supplier_details(3)

    assert result == {
        "found": True,
        "supplier": fake_supplier_client.responses["/suppliers/3"]["data"],
    }


@pytest.mark.anyio
async def test_get_supplier_details_handles_not_found(
    fake_supplier_client,
):
    fake_supplier_client.responses["/suppliers/999"] = ERPHTTPError(
        404,
        "ERP API returned HTTP 404.",
    )

    result = await supplier.get_supplier_details(999)

    assert result == {
        "found": False,
        "supplier_id": 999,
        "message": "Supplier not found.",
    }


@pytest.mark.anyio
async def test_supplier_tools_reject_invalid_arguments(
    fake_supplier_client,
):
    with pytest.raises(ValueError, match="page"):
        await supplier.get_suppliers(0)
    with pytest.raises(ValueError, match="supplier_id"):
        await supplier.get_supplier_details(0)


@pytest.mark.anyio
async def test_supplier_tools_propagate_laravel_errors(
    fake_supplier_client,
):
    fake_supplier_client.responses["/suppliers"] = ERPHTTPError(
        500,
        "ERP API returned HTTP 500.",
    )

    with pytest.raises(ERPHTTPError, match="HTTP 500"):
        await supplier.get_suppliers()


@pytest.mark.anyio
async def test_get_purchase_requests_returns_paginated_page(
    fake_purchase_request_client,
):
    fake_purchase_request_client.responses["/purchase-requests"] = {
        "data": [
            {
                "id": 4,
                "request_number": "PR-20261109-ABC123",
                "status": "pending",
                "supplier": {"id": 2, "name": "Acme Supplies"},
                "items": [
                    {
                        "id": 8,
                        "item_id": 7,
                        "quantity": 10,
                        "unit_price": "4.50",
                        "item": {"id": 7, "name": "Widget"},
                    }
                ],
            }
        ],
        "current_page": 2,
        "last_page": 3,
        "per_page": 15,
        "total": 31,
    }

    result = await purchase_request.get_purchase_requests(page=2)

    assert result["data"][0]["status"] == "pending"
    assert result["data"][0]["items"][0]["item"]["name"] == "Widget"
    assert result["last_page"] == 3
    assert fake_purchase_request_client.calls == [
        ("/purchase-requests", {"params": {"page": 2}})
    ]


@pytest.mark.anyio
async def test_get_purchase_request_details_returns_related_data(
    fake_purchase_request_client,
):
    fake_purchase_request_client.responses["/purchase-requests/4"] = {
        "data": {
            "id": 4,
            "request_number": "PR-20261109-ABC123",
            "supplier": {"id": 2, "name": "Acme Supplies"},
            "items": [{"id": 8, "item": {"id": 7, "name": "Widget"}}],
        }
    }

    result = await purchase_request.get_purchase_request_details(4)

    assert result == {
        "found": True,
        "purchase_request": (
            fake_purchase_request_client.responses[
                "/purchase-requests/4"
            ]["data"]
        ),
    }


@pytest.mark.anyio
async def test_get_purchase_request_details_handles_not_found(
    fake_purchase_request_client,
):
    fake_purchase_request_client.responses["/purchase-requests/999"] = (
        ERPHTTPError(404, "ERP API returned HTTP 404.")
    )

    result = await purchase_request.get_purchase_request_details(999)

    assert result == {
        "found": False,
        "purchase_request_id": 999,
        "message": "Purchase request not found.",
    }


@pytest.mark.anyio
async def test_purchase_request_tools_reject_invalid_arguments(
    fake_purchase_request_client,
):
    with pytest.raises(ValueError, match="page"):
        await purchase_request.get_purchase_requests(0)
    with pytest.raises(ValueError, match="purchase_request_id"):
        await purchase_request.get_purchase_request_details(0)


@pytest.mark.anyio
async def test_purchase_request_tools_propagate_laravel_errors(
    fake_purchase_request_client,
):
    fake_purchase_request_client.responses["/purchase-requests"] = (
        ERPHTTPError(500, "ERP API returned HTTP 500.")
    )

    with pytest.raises(ERPHTTPError, match="HTTP 500"):
        await purchase_request.get_purchase_requests()


@pytest.mark.anyio
async def test_get_goods_receipts_returns_paginated_page(
    fake_goods_receipt_client,
):
    fake_goods_receipt_client.responses["/goods-receipts"] = {
        "data": [
            {
                "id": 6,
                "receipt_number": "GR-20261109-ABC123",
                "purchase_request_id": 4,
                "supplier": {"id": 2, "name": "Acme Supplies"},
                "items": [
                    {
                        "id": 9,
                        "quantity_received": 8,
                        "purchase_request_item": {
                            "item": {"id": 7, "name": "Widget"}
                        },
                    }
                ],
            }
        ],
        "current_page": 2,
        "last_page": 3,
        "per_page": 15,
        "total": 31,
    }

    result = await goods_receipt.get_goods_receipts(page=2)

    assert result["data"][0]["receipt_number"] == "GR-20261109-ABC123"
    assert result["data"][0]["items"][0]["purchase_request_item"]["item"][
        "name"
    ] == "Widget"
    assert result["last_page"] == 3
    assert fake_goods_receipt_client.calls == [
        ("/goods-receipts", {"params": {"page": 2}})
    ]


@pytest.mark.anyio
async def test_get_goods_receipt_details_returns_associated_data(
    fake_goods_receipt_client,
):
    fake_goods_receipt_client.responses["/goods-receipts/6"] = {
        "data": {
            "id": 6,
            "receipt_number": "GR-20261109-ABC123",
            "purchase_request": {
                "id": 4,
                "request_number": "PR-20261109-REQ123",
            },
            "supplier": {"id": 2, "name": "Acme Supplies"},
            "items": [
                {
                    "id": 9,
                    "quantity_received": 8,
                    "purchase_request_item": {
                        "item": {"id": 7, "name": "Widget"}
                    },
                }
            ],
        }
    }

    result = await goods_receipt.get_goods_receipt_details(6)

    assert result == {
        "found": True,
        "goods_receipt": (
            fake_goods_receipt_client.responses[
                "/goods-receipts/6"
            ]["data"]
        ),
    }


@pytest.mark.anyio
async def test_get_goods_receipt_details_handles_not_found(
    fake_goods_receipt_client,
):
    fake_goods_receipt_client.responses["/goods-receipts/999"] = (
        ERPHTTPError(404, "ERP API returned HTTP 404.")
    )

    result = await goods_receipt.get_goods_receipt_details(999)

    assert result == {
        "found": False,
        "goods_receipt_id": 999,
        "message": "Goods receipt not found.",
    }


@pytest.mark.anyio
async def test_goods_receipt_tools_reject_invalid_arguments(
    fake_goods_receipt_client,
):
    with pytest.raises(ValueError, match="page"):
        await goods_receipt.get_goods_receipts(0)
    with pytest.raises(ValueError, match="goods_receipt_id"):
        await goods_receipt.get_goods_receipt_details(0)


@pytest.mark.anyio
async def test_goods_receipt_tools_propagate_laravel_errors(
    fake_goods_receipt_client,
):
    fake_goods_receipt_client.responses["/goods-receipts"] = ERPHTTPError(
        500,
        "ERP API returned HTTP 500.",
    )

    with pytest.raises(ERPHTTPError, match="HTTP 500"):
        await goods_receipt.get_goods_receipts()
