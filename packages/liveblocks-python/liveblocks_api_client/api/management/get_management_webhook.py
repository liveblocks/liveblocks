from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.management_webhook_response import ManagementWebhookResponse


def _get_kwargs(
    project_id: str,
    webhook_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/management/projects/{project_id}/webhooks/{webhook_id}".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> ManagementWebhookResponse:
    if response.status_code == 200:
        response_200 = ManagementWebhookResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.Client,
) -> ManagementWebhookResponse:
    """Get webhook

     Get one webhook by `webhookId` for a project. Returns webhook settings such as URL, subscribed
    events, disabled state, throttling, and additional headers. Returns `404` if the project or webhook
    does not exist. This endpoint requires the `read:all` scope.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookResponse
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
) -> ManagementWebhookResponse:
    """Get webhook

     Get one webhook by `webhookId` for a project. Returns webhook settings such as URL, subscribed
    events, disabled state, throttling, and additional headers. Returns `404` if the project or webhook
    does not exist. This endpoint requires the `read:all` scope.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
