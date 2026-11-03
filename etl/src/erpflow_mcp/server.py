from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from mcp.server import MCPServer

from erpflow_mcp.config import ServiceTokenMiddleware


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

mcp_app = ServiceTokenMiddleware(
    mcp_server.streamable_http_app(
        streamable_http_path="/mcp",
        stateless_http=False,
    )
)


@asynccontextmanager
async def mcp_lifespan(app) -> AsyncIterator[None]:
    """Manage MCP session lifecycle."""

    async with mcp_server.session_manager.run():
        yield