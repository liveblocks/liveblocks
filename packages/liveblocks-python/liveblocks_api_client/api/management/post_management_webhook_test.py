from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.management_webhook_test_request import ManagementWebhookTestRequest
from ...models.management_webhook_test_response import ManagementWebhookTestResponse
from ...types import UNSET, Unset


def _get_kwargs(
    project_id: str,
    webhook_id: str,
    *,
    body: ManagementWebhookTestRequest | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}/webhooks/{webhook_id}/test".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> ManagementWebhookTestResponse:
    if response.status_code == 200:
        response_200 = ManagementWebhookTestResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.Client,
    body: ManagementWebhookTestRequest | Unset = UNSET,
) -> ManagementWebhookTestResponse:
    """Send test webhook

     Send a test event to a webhook and return the created message metadata. `subscribedEvent` must be
    one of the webhook's subscribed events, otherwise the endpoint returns `422`. Returns `404` if the
    project or webhook does not exist. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (ManagementWebhookTestRequest | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookTestResponse
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
    body: ManagementWebhookTestRequest | Unset = UNSET,
) -> ManagementWebhookTestResponse:
    """Send test webhook

     Send a test event to a webhook and return the created message metadata. `subscribedEvent` must be
    one of the webhook's subscribed events, otherwise the endpoint returns `422`. Returns `404` if the
    project or webhook does not exist. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (ManagementWebhookTestRequest | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookTestResponse
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
