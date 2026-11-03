import os
import secrets

from starlette.responses import JSONResponse


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
        authorization = headers.get(b"authorization", b"").decode(
            "latin-1"
        )

        scheme, separator, supplied_token = authorization.partition(" ")

        if (
            not separator
            or scheme.lower() != "bearer"
            or not supplied_token
            or not secrets.compare_digest(
                supplied_token, expected_token
            )
        ):
            response = JSONResponse(
                {"detail": "Invalid or missing service token."},
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)