from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.management_webhook_secret_rotate_response import ManagementWebhookSecretRotateResponse
from ...types import Response


def _get_kwargs(
    project_id: str,
    webhook_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}/webhooks/{webhook_id}/secret/roll".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | ManagementWebhookSecretRotateResponse | None:
    if response.status_code == 200:
        response_200 = ManagementWebhookSecretRotateResponse.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | ManagementWebhookSecretRotateResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    project_id: str,
    webhook_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | ManagementWebhookSecretRotateResponse]:
    """Roll webhook secret

     Rotate a webhook signing secret and return the new secret. The previous secret remains valid for 24
    hours. Returns `404` if the project or webhook does not exist. This endpoint requires the
    `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementWebhookSecretRotateResponse]
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    project_id: str,
    webhook_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | ManagementWebhookSecretRotateResponse | None:
    """Roll webhook secret

     Rotate a webhook signing secret and return the new secret. The previous secret remains valid for 24
    hours. Returns `404` if the project or webhook does not exist. This endpoint requires the
    `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementWebhookSecretRotateResponse
    """

    return sync_detailed(
        project_id=project_id,
        webhook_id=webhook_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    project_id: str,
    webhook_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | ManagementWebhookSecretRotateResponse]:
    """Roll webhook secret

     Rotate a webhook signing secret and return the new secret. The previous secret remains valid for 24
    hours. Returns `404` if the project or webhook does not exist. This endpoint requires the
    `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementWebhookSecretRotateResponse]
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    project_id: str,
    webhook_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | ManagementWebhookSecretRotateResponse | None:
    """Roll webhook secret

     Rotate a webhook signing secret and return the new secret. The previous secret remains valid for 24
    hours. Returns `404` if the project or webhook does not exist. This endpoint requires the
    `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementWebhookSecretRotateResponse
    """

    return (
        await asyncio_detailed(
            project_id=project_id,
            webhook_id=webhook_id,
            client=client,
        )
    ).parsed
