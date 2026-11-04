import logging
import os
import secrets
from dataclasses import dataclass

from starlette.responses import JSONResponse


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MCPSettings:
    """Environment-backed settings for the MCP server and ERP API client."""

    transport: str
    host: str
    port: int
    erp_api_base_url: str
    erp_api_token: str | None
    request_timeout: float
    connect_timeout: float

    @classmethod
    def from_env(cls) -> "MCPSettings":
        transport = os.getenv("MCP_TRANSPORT", "streamable-http").strip().lower()
        if transport != "streamable-http":
            raise ValueError("MCP_TRANSPORT must be 'streamable-http'.")

        host = os.getenv("MCP_HOST", "0.0.0.0").strip()
        if not host:
            raise ValueError("MCP_HOST must not be empty.")

        try:
            port = int(os.getenv("MCP_PORT", "8000"))
        except ValueError as error:
            raise ValueError("MCP_PORT must be an integer.") from error
        if not 1 <= port <= 65535:
            raise ValueError("MCP_PORT must be between 1 and 65535.")

        base_url = os.getenv("ERP_API_BASE_URL", "").strip().rstrip("/")
        if not base_url:
            raise ValueError("ERP_API_BASE_URL must not be empty.")

        try:
            request_timeout = float(os.getenv("ERP_API_TIMEOUT", "30"))
        except ValueError as error:
            raise ValueError("ERP_API_TIMEOUT must be a number.") from error
        if request_timeout <= 0:
            raise ValueError("ERP_API_TIMEOUT must be greater than zero.")

        try:
            connect_timeout = float(
                os.getenv("ERP_API_CONNECT_TIMEOUT", str(request_timeout))
            )
        except ValueError as error:
            raise ValueError(
                "ERP_API_CONNECT_TIMEOUT must be a number."
            ) from error
        if connect_timeout <= 0:
            raise ValueError(
                "ERP_API_CONNECT_TIMEOUT must be greater than zero."
            )

        return cls(
            transport=transport,
            host=host,
            port=port,
            erp_api_base_url=base_url,
            erp_api_token=os.getenv("ERP_API_TOKEN") or None,
            request_timeout=request_timeout,
            connect_timeout=connect_timeout,
        )


class ServiceTokenMiddleware:
    """Protect MCP HTTP requests using the ETL service token."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        expected_token = os.getenv("ETL_SERVICE_TOKEN")

        if not expected_token:
            response = JSONResponse(
                {"detail": "ETL service authentication is not configured."},
                status_code=503,
            )
            await response(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        authorization = headers.get(b"authorization", b"").decode("latin-1")
        scheme, separator, supplied_token = authorization.partition(" ")

        if (
            not separator
            or scheme.lower() != "bearer"
            or not supplied_token
            or not secrets.compare_digest(supplied_token, expected_token)
        ):
            logger.warning("Rejected MCP request with invalid bearer token.")
            response = JSONResponse(
                {"detail": "Invalid or missing service token."},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)