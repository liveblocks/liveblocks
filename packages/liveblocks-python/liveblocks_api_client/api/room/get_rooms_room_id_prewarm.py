from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...types import Response


def _get_kwargs(
    room_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/prewarm".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | Error | None:
    if response.status_code == 204:
        response_204 = cast(Any, None)
        return response_204

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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | Error]:
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
) -> Response[Any | Error]:
    """Prewarm room

     Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be
    connecting to a room with [`RoomProvider`](/docs/api-reference/liveblocks-react#RoomProvider) or
    [`enterRoom`](/docs/api-reference/liveblocks-client#Client.enterRoom) within 10 seconds, and the
    room will load quicker.

    Args:
        room_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | Error | None:
    """Prewarm room

     Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be
    connecting to a room with [`RoomProvider`](/docs/api-reference/liveblocks-react#RoomProvider) or
    [`enterRoom`](/docs/api-reference/liveblocks-client#Client.enterRoom) within 10 seconds, and the
    room will load quicker.

    Args:
        room_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error
    """

    return sync_detailed(
        room_id=room_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | Error]:
    """Prewarm room

     Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be
    connecting to a room with [`RoomProvider`](/docs/api-reference/liveblocks-react#RoomProvider) or
    [`enterRoom`](/docs/api-reference/liveblocks-client#Client.enterRoom) within 10 seconds, and the
    room will load quicker.

    Args:
        room_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | Error | None:
    """Prewarm room

     Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be
    connecting to a room with [`RoomProvider`](/docs/api-reference/liveblocks-react#RoomProvider) or
    [`enterRoom`](/docs/api-reference/liveblocks-client#Client.enterRoom) within 10 seconds, and the
    room will load quicker.

    Args:
        room_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            client=client,
        )
    ).parsed
