from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


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


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
) -> Any:
    """Prewarm room

     Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be
    connecting to a room with [`RoomProvider`](/docs/api-reference/liveblocks-react#RoomProvider) or
    [`enterRoom`](/docs/api-reference/liveblocks-client#Client.enterRoom) within 10 seconds, and the
    room will load quicker.

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
) -> Any:
    """Prewarm room

     Speeds up connecting to a room for the next 10 seconds. Use this when you know a user will be
    connecting to a room with [`RoomProvider`](/docs/api-reference/liveblocks-react#RoomProvider) or
    [`enterRoom`](/docs/api-reference/liveblocks-client#Client.enterRoom) within 10 seconds, and the
    room will load quicker.

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = await client.request(
        **kwargs,
    )

    return None
