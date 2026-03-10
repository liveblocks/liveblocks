from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.recover_management_webhook_failed_messages_request_body import (
    RecoverManagementWebhookFailedMessagesRequestBody,
)


def _get_kwargs(
    project_id: str,
    webhook_id: str,
    *,
    body: RecoverManagementWebhookFailedMessagesRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/management/projects/{project_id}/webhooks/{webhook_id}/recover-failed-messages".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.Client,
    body: RecoverManagementWebhookFailedMessagesRequestBody,
) -> None:
    """Recover failed webhook messages

     Requeue failed deliveries for a webhook from the given `since` timestamp. Returns `200` with an
    empty body when recovery starts, an `404` if the project or webhook does not exist. This endpoint
    requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (RecoverManagementWebhookFailedMessagesRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
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
    body: RecoverManagementWebhookFailedMessagesRequestBody,
) -> None:
    """Recover failed webhook messages

     Requeue failed deliveries for a webhook from the given `since` timestamp. Returns `200` with an
    empty body when recovery starts, an `404` if the project or webhook does not exist. This endpoint
    requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (RecoverManagementWebhookFailedMessagesRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
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
