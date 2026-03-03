from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_management_webhook import CreateManagementWebhook
from ...models.management_webhook_response import ManagementWebhookResponse
from ...types import UNSET, Unset


def _get_kwargs(
    project_id: str,
    *,
    body: CreateManagementWebhook | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}/webhooks".format(
            project_id=quote(str(project_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> ManagementWebhookResponse:
    if response.status_code == 200:
        response_200 = ManagementWebhookResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    *,
    client: httpx.Client,
    body: CreateManagementWebhook | Unset = UNSET,
) -> ManagementWebhookResponse:
    """Create webhook

     Creates a new webhook for a project. This endpoint requires the `write:all` scope. If the project
    cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        body (CreateManagementWebhook | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    project_id: str,
    *,
    client: httpx.AsyncClient,
    body: CreateManagementWebhook | Unset = UNSET,
) -> ManagementWebhookResponse:
    """Create webhook

     Creates a new webhook for a project. This endpoint requires the `write:all` scope. If the project
    cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        body (CreateManagementWebhook | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ManagementWebhookResponse
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
