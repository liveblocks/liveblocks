from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.management_webhook_headers_delete import ManagementWebhookHeadersDelete
from ...models.management_webhook_headers_response import ManagementWebhookHeadersResponse
from ...types import UNSET, Unset


def _get_kwargs(
    project_id: str,
    webhook_id: str,
    *,
    body: ManagementWebhookHeadersDelete | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}/webhooks/{webhook_id}/delete-additional-headers".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> ManagementWebhookHeadersResponse:
    if response.status_code == 200:
        response_200 = ManagementWebhookHeadersResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.Client,
    body: ManagementWebhookHeadersDelete | Unset = UNSET,
) -> ManagementWebhookHeadersResponse:
    """Delete webhook headers

     Remove selected additional headers from a webhook. Send header names in `headers` field; other
    headers are unchanged. Returns updated headers, or `404` if the project or webhook does not exist.
    This endpoint requires the `write:all` scope. At least one header name must be provided; otherwise,
    a 422 error response is returned.

    Args:
        project_id (str):
        webhook_id (str):
        body (ManagementWebhookHeadersDelete | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookHeadersResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.AsyncClient,
    body: ManagementWebhookHeadersDelete | Unset = UNSET,
) -> ManagementWebhookHeadersResponse:
    """Delete webhook headers

     Remove selected additional headers from a webhook. Send header names in `headers` field; other
    headers are unchanged. Returns updated headers, or `404` if the project or webhook does not exist.
    This endpoint requires the `write:all` scope. At least one header name must be provided; otherwise,
    a 422 error response is returned.

    Args:
        project_id (str):
        webhook_id (str):
        body (ManagementWebhookHeadersDelete | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookHeadersResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
