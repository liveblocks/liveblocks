from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.test_management_webhook_request_body import TestManagementWebhookRequestBody
from ...models.test_management_webhook_response import TestManagementWebhookResponse


def _get_kwargs(
    project_id: str,
    webhook_id: str,
    *,
    body: TestManagementWebhookRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}/webhooks/{webhook_id}/test".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> TestManagementWebhookResponse:
    if response.status_code == 200:
        response_200 = TestManagementWebhookResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.Client,
    body: TestManagementWebhookRequestBody,
) -> TestManagementWebhookResponse:
    """Send test webhook

     Send a test event to a webhook and return the created message metadata. `subscribedEvent` must be
    one of the webhook's subscribed events, otherwise the endpoint returns `422`. Returns `404` if the
    project or webhook does not exist. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (TestManagementWebhookRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        TestManagementWebhookResponse
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
    body: TestManagementWebhookRequestBody,
) -> TestManagementWebhookResponse:
    """Send test webhook

     Send a test event to a webhook and return the created message metadata. `subscribedEvent` must be
    one of the webhook's subscribed events, otherwise the endpoint returns `422`. Returns `404` if the
    project or webhook does not exist. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (TestManagementWebhookRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        TestManagementWebhookResponse
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
