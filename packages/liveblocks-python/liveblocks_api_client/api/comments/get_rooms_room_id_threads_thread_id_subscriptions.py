from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_rooms_room_id_threads_thread_id_subscriptions_response_200 import (
    GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200,
)
from ...types import Response


def _get_kwargs(
    room_id: str,
    thread_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/threads/{thread_id}/subscriptions".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200 | None:
    if response.status_code == 200:
        response_200 = GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200.from_dict(response.json())

        return response_200

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
) -> Response[Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200]:
    """Get thread subscriptions

     This endpoint gets the list of subscriptions to a thread. Corresponds to
    [`liveblocks.getThreadSubscriptions`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-
    threadId-subscriptions).

    Args:
        room_id (str):
        thread_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200 | None:
    """Get thread subscriptions

     This endpoint gets the list of subscriptions to a thread. Corresponds to
    [`liveblocks.getThreadSubscriptions`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-
    threadId-subscriptions).

    Args:
        room_id (str):
        thread_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200
    """

    return sync_detailed(
        room_id=room_id,
        thread_id=thread_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200]:
    """Get thread subscriptions

     This endpoint gets the list of subscriptions to a thread. Corresponds to
    [`liveblocks.getThreadSubscriptions`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-
    threadId-subscriptions).

    Args:
        room_id (str):
        thread_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200 | None:
    """Get thread subscriptions

     This endpoint gets the list of subscriptions to a thread. Corresponds to
    [`liveblocks.getThreadSubscriptions`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-
    threadId-subscriptions).

    Args:
        room_id (str):
        thread_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetRoomsRoomIdThreadsThreadIdSubscriptionsResponse200
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            thread_id=thread_id,
            client=client,
        )
    ).parsed
