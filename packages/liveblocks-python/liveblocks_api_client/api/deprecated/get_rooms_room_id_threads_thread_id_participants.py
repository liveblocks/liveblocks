from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_rooms_room_id_threads_thread_id_participants_response_200 import (
    GetRoomsRoomIdThreadsThreadIdParticipantsResponse200,
)


def _get_kwargs(
    room_id: str,
    thread_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/threads/{thread_id}/participants".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetRoomsRoomIdThreadsThreadIdParticipantsResponse200:
    if response.status_code == 200:
        response_200 = GetRoomsRoomIdThreadsThreadIdParticipantsResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.Client,
) -> GetRoomsRoomIdThreadsThreadIdParticipantsResponse200:
    """Get thread participants

     **Deprecated.** Prefer using [thread subscriptions](#get-rooms-roomId-threads-threadId-
    subscriptions) instead.

    This endpoint returns the list of thread participants. It is a list of unique user IDs representing
    all the thread comment authors and mentioned users in comments. Corresponds to
    [`liveblocks.getThreadParticipants`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-
    threadId-participants).

    Args:
        room_id (str):
        thread_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetRoomsRoomIdThreadsThreadIdParticipantsResponse200
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
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
) -> GetRoomsRoomIdThreadsThreadIdParticipantsResponse200:
    """Get thread participants

     **Deprecated.** Prefer using [thread subscriptions](#get-rooms-roomId-threads-threadId-
    subscriptions) instead.

    This endpoint returns the list of thread participants. It is a list of unique user IDs representing
    all the thread comment authors and mentioned users in comments. Corresponds to
    [`liveblocks.getThreadParticipants`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads-
    threadId-participants).

    Args:
        room_id (str):
        thread_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetRoomsRoomIdThreadsThreadIdParticipantsResponse200
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
