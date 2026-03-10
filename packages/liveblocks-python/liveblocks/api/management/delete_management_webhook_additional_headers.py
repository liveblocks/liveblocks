from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.delete_management_webhook_headers_request_body import DeleteManagementWebhookHeadersRequestBody
from ...models.delete_management_webhook_headers_response import DeleteManagementWebhookHeadersResponse


def _get_kwargs(
    project_id: str,
    webhook_id: str,
    *,
    body: DeleteManagementWebhookHeadersRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/management/projects/{project_id}/webhooks/{webhook_id}/delete-additional-headers".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> DeleteManagementWebhookHeadersResponse:
    if response.status_code == 200:
        response_200 = DeleteManagementWebhookHeadersResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.Client,
    body: DeleteManagementWebhookHeadersRequestBody,
) -> DeleteManagementWebhookHeadersResponse:
    """Delete webhook headers

     Remove selected additional headers from a webhook. Send header names in `headers` field; other
    headers are unchanged. Returns updated headers, or `404` if the project or webhook does not exist.
    This endpoint requires the `write:all` scope. At least one header name must be provided; otherwise,
    a 422 error response is returned.

    Args:
        project_id (str):
        webhook_id (str):
        body (DeleteManagementWebhookHeadersRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        DeleteManagementWebhookHeadersResponse
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
    body: DeleteManagementWebhookHeadersRequestBody,
) -> DeleteManagementWebhookHeadersResponse:
    """Delete webhook headers

     Remove selected additional headers from a webhook. Send header names in `headers` field; other
    headers are unchanged. Returns updated headers, or `404` if the project or webhook does not exist.
    This endpoint requires the `write:all` scope. At least one header name must be provided; otherwise,
    a 422 error response is returned.

    Args:
        project_id (str):
        webhook_id (str):
        body (DeleteManagementWebhookHeadersRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        DeleteManagementWebhookHeadersResponse
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
