from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.management_webhooks_response import ManagementWebhooksResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
    project_id: str,
    *,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["cursor"] = cursor

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/management/projects/{project_id}/webhooks".format(
            project_id=quote(str(project_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | ManagementWebhooksResponse | None:
    if response.status_code == 200:
        response_200 = ManagementWebhooksResponse.from_dict(response.json())

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
) -> Response[Error | ManagementWebhooksResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    project_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Response[Error | ManagementWebhooksResponse]:
    """List webhooks

     Returns a paginated list of webhooks for a project. This endpoint requires the `read:all` scope. The
    response includes an array of webhook objects associated with the specified project, as well as a
    `nextCursor` property for pagination. Use the `limit` query parameter to specify the maximum number
    of webhooks to return (1-100, default 20). If the result is paginated, use the `cursor` parameter
    from the `nextCursor` value in the previous response to fetch subsequent pages. If the project
    cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementWebhooksResponse]
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        limit=limit,
        cursor=cursor,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    project_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Error | ManagementWebhooksResponse | None:
    """List webhooks

     Returns a paginated list of webhooks for a project. This endpoint requires the `read:all` scope. The
    response includes an array of webhook objects associated with the specified project, as well as a
    `nextCursor` property for pagination. Use the `limit` query parameter to specify the maximum number
    of webhooks to return (1-100, default 20). If the result is paginated, use the `cursor` parameter
    from the `nextCursor` value in the previous response to fetch subsequent pages. If the project
    cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementWebhooksResponse
    """

    return sync_detailed(
        project_id=project_id,
        client=client,
        limit=limit,
        cursor=cursor,
    ).parsed


async def asyncio_detailed(
    project_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Response[Error | ManagementWebhooksResponse]:
    """List webhooks

     Returns a paginated list of webhooks for a project. This endpoint requires the `read:all` scope. The
    response includes an array of webhook objects associated with the specified project, as well as a
    `nextCursor` property for pagination. Use the `limit` query parameter to specify the maximum number
    of webhooks to return (1-100, default 20). If the result is paginated, use the `cursor` parameter
    from the `nextCursor` value in the previous response to fetch subsequent pages. If the project
    cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementWebhooksResponse]
    """

    kwargs = _get_kwargs(
        project_id=project_id,
        limit=limit,
        cursor=cursor,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    project_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Error | ManagementWebhooksResponse | None:
    """List webhooks

     Returns a paginated list of webhooks for a project. This endpoint requires the `read:all` scope. The
    response includes an array of webhook objects associated with the specified project, as well as a
    `nextCursor` property for pagination. Use the `limit` query parameter to specify the maximum number
    of webhooks to return (1-100, default 20). If the result is paginated, use the `cursor` parameter
    from the `nextCursor` value in the previous response to fetch subsequent pages. If the project
    cannot be found, a 404 error response is returned.

    Args:
        project_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementWebhooksResponse
    """

    return (
        await asyncio_detailed(
            project_id=project_id,
            client=client,
            limit=limit,
            cursor=cursor,
        )
    ).parsed
