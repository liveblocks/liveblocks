from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.room import Room


def _get_kwargs(
    room_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> Room:
    if response.status_code == 200:
        response_200 = Room.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
) -> Room:
    """Get room

     This endpoint returns a room by its ID. Corresponds to [`liveblocks.getRoom`](/docs/api-
    reference/liveblocks-node#get-rooms-roomid).

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Room
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
) -> Room:
    """Get room

     This endpoint returns a room by its ID. Corresponds to [`liveblocks.getRoom`](/docs/api-
    reference/liveblocks-node#get-rooms-roomid).

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Room
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
