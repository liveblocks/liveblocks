from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    room_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/v2/rooms/{room_id}".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
) -> None:
    """Delete room

     This endpoint deletes a room. A deleted room is no longer accessible from the API or the dashboard
    and it cannot be restored. Corresponds to [`liveblocks.deleteRoom`](/docs/api-reference/liveblocks-
    node#delete-rooms-roomid).

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
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
) -> None:
    """Delete room

     This endpoint deletes a room. A deleted room is no longer accessible from the API or the dashboard
    and it cannot be restored. Corresponds to [`liveblocks.deleteRoom`](/docs/api-reference/liveblocks-
    node#delete-rooms-roomid).

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
