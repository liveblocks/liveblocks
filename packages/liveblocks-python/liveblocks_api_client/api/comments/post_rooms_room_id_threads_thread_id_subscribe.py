from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.post_rooms_room_id_threads_thread_id_subscribe_body import PostRoomsRoomIdThreadsThreadIdSubscribeBody
from ...models.subscription import Subscription


def _get_kwargs(
    room_id: str,
    thread_id: str,
    *,
    body: PostRoomsRoomIdThreadsThreadIdSubscribeBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/subscribe".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Subscription:
    if response.status_code == 200:
        response_200 = Subscription.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.Client,
    body: PostRoomsRoomIdThreadsThreadIdSubscribeBody,
) -> Subscription:
    """Subscribe to thread

     This endpoint subscribes to a thread. Corresponds to [`liveblocks.subscribeToThread`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-subscribe).

    Args:
        room_id (str):
        thread_id (str):
        body (PostRoomsRoomIdThreadsThreadIdSubscribeBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Subscription
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.AsyncClient,
    body: PostRoomsRoomIdThreadsThreadIdSubscribeBody,
) -> Subscription:
    """Subscribe to thread

     This endpoint subscribes to a thread. Corresponds to [`liveblocks.subscribeToThread`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-subscribe).

    Args:
        room_id (str):
        thread_id (str):
        body (PostRoomsRoomIdThreadsThreadIdSubscribeBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Subscription
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
