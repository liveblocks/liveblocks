from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.update_management_webhook_request_body import UpdateManagementWebhookRequestBody
from ...models.update_management_webhook_response import UpdateManagementWebhookResponse


def _get_kwargs(
    project_id: str,
    webhook_id: str,
    *,
    body: UpdateManagementWebhookRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/management/projects/{project_id}/webhooks/{webhook_id}".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> UpdateManagementWebhookResponse:
    if response.status_code == 200:
        response_200 = UpdateManagementWebhookResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.Client,
    body: UpdateManagementWebhookRequestBody,
) -> UpdateManagementWebhookResponse:
    """Update webhook

     Update one webhook by `webhookId` for a project. Send only fields you want to change; omitted fields
    stay unchanged. Returns `404` if the project or webhook does not exist and `422` for validation
    errors. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (UpdateManagementWebhookRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        UpdateManagementWebhookResponse
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
    body: UpdateManagementWebhookRequestBody,
) -> UpdateManagementWebhookResponse:
    """Update webhook

     Update one webhook by `webhookId` for a project. Send only fields you want to change; omitted fields
    stay unchanged. Returns `404` if the project or webhook does not exist and `422` for validation
    errors. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (UpdateManagementWebhookRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        UpdateManagementWebhookResponse
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
