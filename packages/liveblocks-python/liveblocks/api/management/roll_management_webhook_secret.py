from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.rotate_management_webhook_secret_response import RotateManagementWebhookSecretResponse


def _get_kwargs(
    project_id: str,
    webhook_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/management/projects/{project_id}/webhooks/{webhook_id}/secret/roll".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> RotateManagementWebhookSecretResponse:
    if response.status_code == 200:
        response_200 = RotateManagementWebhookSecretResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    webhook_id: str,
    *,
    client: httpx.Client,
) -> RotateManagementWebhookSecretResponse:
    """Roll webhook secret

     Rotate a webhook signing secret and return the new secret. The previous secret remains valid for 24
    hours. Returns `404` if the project or webhook does not exist. This endpoint requires the
    `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        RotateManagementWebhookSecretResponse
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
) -> RotateManagementWebhookSecretResponse:
    """Roll webhook secret

     Rotate a webhook signing secret and return the new secret. The previous secret remains valid for 24
    hours. Returns `404` if the project or webhook does not exist. This endpoint requires the
    `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        RotateManagementWebhookSecretResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
