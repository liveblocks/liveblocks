from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.management_projects_response import ManagementProjectsResponse
from ...types import UNSET, Response, Unset


def _get_kwargs(
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
        "url": "/management/projects",
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | ManagementProjectsResponse | None:
    if response.status_code == 200:
        response_200 = ManagementProjectsResponse.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 422:
        response_422 = Error.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | ManagementProjectsResponse]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Response[Error | ManagementProjectsResponse]:
    """List projects

     Returns a paginated list of projects. You can limit the number of projects returned per page and use
    the provided `nextCursor` for pagination. This endpoint requires the `read:all` scope.

    Args:
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementProjectsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        cursor=cursor,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Error | ManagementProjectsResponse | None:
    """List projects

     Returns a paginated list of projects. You can limit the number of projects returned per page and use
    the provided `nextCursor` for pagination. This endpoint requires the `read:all` scope.

    Args:
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementProjectsResponse
    """

    return sync_detailed(
        client=client,
        limit=limit,
        cursor=cursor,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Response[Error | ManagementProjectsResponse]:
    """List projects

     Returns a paginated list of projects. You can limit the number of projects returned per page and use
    the provided `nextCursor` for pagination. This endpoint requires the `read:all` scope.

    Args:
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ManagementProjectsResponse]
    """

    kwargs = _get_kwargs(
        limit=limit,
        cursor=cursor,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Error | ManagementProjectsResponse | None:
    """List projects

     Returns a paginated list of projects. You can limit the number of projects returned per page and use
    the provided `nextCursor` for pagination. This endpoint requires the `read:all` scope.

    Args:
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ManagementProjectsResponse
    """

    return (
        await asyncio_detailed(
            client=client,
            limit=limit,
            cursor=cursor,
        )
    ).parsed
