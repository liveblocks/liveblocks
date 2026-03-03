from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.management_webhook_headers_response import ManagementWebhookHeadersResponse


def _get_kwargs(
    project_id: str,
    webhook_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/management/projects/{project_id}/webhooks/{webhook_id}/additional-headers".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

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
) -> ManagementWebhookHeadersResponse:
    """Get webhook headers

     Get a webhook's additional headers. Returns `404` if the project or webhook does not exist. Requires
    `read:all`.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookHeadersResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
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
) -> ManagementWebhookHeadersResponse:
    """Get webhook headers

     Get a webhook's additional headers. Returns `404` if the project or webhook does not exist. Requires
    `read:all`.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookHeadersResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
