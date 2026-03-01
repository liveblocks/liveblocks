from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_yjs_versions import GetYjsVersions
from ...types import UNSET, Response, Unset


def _get_kwargs(
    room_id: str,
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
        "url": "/rooms/{room_id}/versions".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | GetYjsVersions | None:
    if response.status_code == 200:
        response_200 = GetYjsVersions.from_dict(response.json())

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
) -> Response[Error | GetYjsVersions]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Response[Error | GetYjsVersions]:
    """Get Yjs version history

     This endpoint returns a list of version history snapshots for the room's Yjs document. The versions
    are returned sorted by creation date, from newest to oldest.

    Args:
        room_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetYjsVersions]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        limit=limit,
        cursor=cursor,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Error | GetYjsVersions | None:
    """Get Yjs version history

     This endpoint returns a list of version history snapshots for the room's Yjs document. The versions
    are returned sorted by creation date, from newest to oldest.

    Args:
        room_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetYjsVersions
    """

    return sync_detailed(
        room_id=room_id,
        client=client,
        limit=limit,
        cursor=cursor,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Response[Error | GetYjsVersions]:
    """Get Yjs version history

     This endpoint returns a list of version history snapshots for the room's Yjs document. The versions
    are returned sorted by creation date, from newest to oldest.

    Args:
        room_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetYjsVersions]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        limit=limit,
        cursor=cursor,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> Error | GetYjsVersions | None:
    """Get Yjs version history

     This endpoint returns a list of version history snapshots for the room's Yjs document. The versions
    are returned sorted by creation date, from newest to oldest.

    Args:
        room_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetYjsVersions
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            client=client,
            limit=limit,
            cursor=cursor,
        )
    ).parsed
