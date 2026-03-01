from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.management_webhook_headers_patch import ManagementWebhookHeadersPatch
from ...models.management_webhook_headers_response import ManagementWebhookHeadersResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    project_id: str,
    webhook_id: str,
    *,
    body: ManagementWebhookHeadersPatch | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/management/projects/{project_id}/webhooks/{webhook_id}/additional-headers".format(
            project_id=quote(str(project_id), safe=""),
            webhook_id=quote(str(webhook_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | ManagementWebhookHeadersResponse | None:
    if response.status_code == 200:
        response_200 = ManagementWebhookHeadersResponse.from_dict(response.json())

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

    if response.status_code == 422:
        response_422 = Error.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | ManagementWebhookHeadersResponse]:
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
    body: ManagementWebhookHeadersPatch | Unset = UNSET,
) -> Response[Error | ManagementWebhookHeadersResponse]:
    """Patch webhook headers

     Upsert additional headers for a webhook. Provided headers are merged with existing headers, and
    existing values are overwritten when names match. Returns updated headers, or `404` if the project
    or webhook does not exist. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (ManagementWebhookHeadersPatch | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementWebhookHeadersResponse]
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
        body=body,
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
    body: ManagementWebhookHeadersPatch | Unset = UNSET,
) -> Error | ManagementWebhookHeadersResponse | None:
    """Patch webhook headers

     Upsert additional headers for a webhook. Provided headers are merged with existing headers, and
    existing values are overwritten when names match. Returns updated headers, or `404` if the project
    or webhook does not exist. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (ManagementWebhookHeadersPatch | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementWebhookHeadersResponse
    """

    return sync_detailed(
        project_id=project_id,
        webhook_id=webhook_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    project_id: str,
    webhook_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: ManagementWebhookHeadersPatch | Unset = UNSET,
) -> Response[Error | ManagementWebhookHeadersResponse]:
    """Patch webhook headers

     Upsert additional headers for a webhook. Provided headers are merged with existing headers, and
    existing values are overwritten when names match. Returns updated headers, or `404` if the project
    or webhook does not exist. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (ManagementWebhookHeadersPatch | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementWebhookHeadersResponse]
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        webhook_id=webhook_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    project_id: str,
    webhook_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: ManagementWebhookHeadersPatch | Unset = UNSET,
) -> Error | ManagementWebhookHeadersResponse | None:
    """Patch webhook headers

     Upsert additional headers for a webhook. Provided headers are merged with existing headers, and
    existing values are overwritten when names match. Returns updated headers, or `404` if the project
    or webhook does not exist. This endpoint requires the `write:all` scope.

    Args:
        project_id (str):
        webhook_id (str):
        body (ManagementWebhookHeadersPatch | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementWebhookHeadersResponse
    """

    return (
        await asyncio_detailed(
            project_id=project_id,
            webhook_id=webhook_id,
            client=client,
            body=body,
        )
    ).parsed
