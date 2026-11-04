import httpx
import pytest

from erpflow_mcp.api_client import (
    ERPAPIClient,
    ERPAPIError,
    ERPAuthenticationError,
    ERPHTTPError,
    ERPInvalidResponseError,
)
from erpflow_mcp.config import MCPSettings
from erpflow_mcp.server import mcp_app, mcp_server


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
