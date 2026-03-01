from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.post_rooms_room_id_threads_thread_id_unsubscribe_body import (
    PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
)
from ...models.post_rooms_room_id_threads_thread_id_unsubscribe_response_200 import (
    PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200,
)
from ...types import Response


def _get_kwargs(
    room_id: str,
    thread_id: str,
    *,
    body: PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/unsubscribe".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200 | None:
    if response.status_code == 200:
        response_200 = PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200.from_dict(response.json())

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
) -> Response[Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200]:
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
    body: PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
) -> Response[Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200]:
    """Unsubscribe from thread

     This endpoint unsubscribes from a thread. Corresponds to
    [`liveblocks.unsubscribeFromThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-unsubscribe).

    Args:
        room_id (str):
        thread_id (str):
        body (PostRoomsRoomIdThreadsThreadIdUnsubscribeBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
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
    body: PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
) -> Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200 | None:
    """Unsubscribe from thread

     This endpoint unsubscribes from a thread. Corresponds to
    [`liveblocks.unsubscribeFromThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-unsubscribe).

    Args:
        room_id (str):
        thread_id (str):
        body (PostRoomsRoomIdThreadsThreadIdUnsubscribeBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200
    """

    return sync_detailed(
        room_id=room_id,
        thread_id=thread_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
) -> Response[Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200]:
    """Unsubscribe from thread

     This endpoint unsubscribes from a thread. Corresponds to
    [`liveblocks.unsubscribeFromThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-unsubscribe).

    Args:
        room_id (str):
        thread_id (str):
        body (PostRoomsRoomIdThreadsThreadIdUnsubscribeBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: PostRoomsRoomIdThreadsThreadIdUnsubscribeBody,
) -> Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200 | None:
    """Unsubscribe from thread

     This endpoint unsubscribes from a thread. Corresponds to
    [`liveblocks.unsubscribeFromThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-unsubscribe).

    Args:
        room_id (str):
        thread_id (str):
        body (PostRoomsRoomIdThreadsThreadIdUnsubscribeBody):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PostRoomsRoomIdThreadsThreadIdUnsubscribeResponse200
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            thread_id=thread_id,
            client=client,
            body=body,
        )
    ).parsed
