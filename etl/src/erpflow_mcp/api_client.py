import logging
from collections.abc import AsyncIterator, Mapping
from typing import Any

import httpx

from erpflow_mcp.config import MCPSettings


logger = logging.getLogger(__name__)


class ERPAPIError(Exception):
    """Base exception for errors returned by the ERP API client."""


class ERPAuthenticationError(ERPAPIError):
    """Raised when the Laravel API rejects authentication."""


class ERPHTTPError(ERPAPIError):
    """Raised for non-authentication HTTP failures."""

    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


class ERPInvalidResponseError(ERPAPIError):
    """Raised when the ERP API returns an unusable JSON response."""


class ERPAPIClient:
    """Reusable asynchronous client for Laravel's JSON API."""

    def __init__(
        self,
        settings: MCPSettings,
        http_client: httpx.AsyncClient | None = None,
    ):
        self._settings = settings
        self._client = http_client or httpx.AsyncClient(
            base_url=settings.erp_api_base_url,
            timeout=httpx.Timeout(
                settings.request_timeout,
                connect=settings.connect_timeout,
            ),
        )
        self._owns_client = http_client is None

    async def __aenter__(self) -> "ERPAPIClient":
        return self

    async def __aexit__(self, exc_type, exc_value, traceback) -> None:
        await self.close()

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def request(
        self,
        method: str,
        path: str,
        **kwargs: Any,
    ) -> Any:
        headers = dict(kwargs.pop("headers", {}))
        if self._settings.erp_api_token:
            headers["Authorization"] = (
                f"Bearer {self._settings.erp_api_token}"
            )
        headers.setdefault("Accept", "application/json")

        try:
            response = await self._client.request(
                method,
                path,
                headers=headers,
                **kwargs,
            )
        except httpx.TimeoutException as error:
            logger.warning("ERP API request timed out: %s %s", method, path)
            raise ERPAPIError("ERP API request timed out.") from error
        except httpx.RequestError as error:
            logger.warning("ERP API request failed: %s %s", method, path)
            raise ERPAPIError("ERP API request failed.") from error

        if response.status_code in {401, 403}:
            raise ERPAuthenticationError("ERP API authentication failed.")
        if response.is_error:
            raise ERPHTTPError(
                response.status_code,
                f"ERP API returned HTTP {response.status_code}.",
            )

        try:
            return response.json()
        except (ValueError, TypeError) as error:
            raise ERPInvalidResponseError(
                "ERP API returned invalid JSON."
            ) from error

    async def get(self, path: str, **kwargs: Any) -> Any:
        return await self.request("GET", path, **kwargs)

    async def get_paginated(
        self,
        path: str,
        *,
        params: Mapping[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield Laravel pagination envelopes one page at a time."""
        page = 1
        request_params = dict(params or {})

        while True:
            request_params["page"] = page
            body = await self.get(path, params=request_params)
            if not isinstance(body, dict):
                raise ERPInvalidResponseError(
                    "Paginated ERP API response must be a JSON object."
                )

            yield body
            last_page = body.get("last_page")
            current_page = body.get("current_page", page)
            if not isinstance(last_page, int) or not isinstance(
                current_page, int
            ):
                raise ERPInvalidResponseError(
                    "Paginated ERP API response is missing page metadata."
                )
            if current_page >= last_page:
                return
            page = current_page + 1
