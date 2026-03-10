from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.active_users_response import ActiveUsersResponse


def _get_kwargs(
    room_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/active_users".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> ActiveUsersResponse:
    if response.status_code == 200:
        response_200 = ActiveUsersResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
) -> ActiveUsersResponse:
    """Get active users

     This endpoint returns a list of users currently present in the requested room. Corresponds to
    [`liveblocks.getActiveUsers`](/docs/api-reference/liveblocks-node#get-rooms-roomid-active-users).

    For optimal performance, we recommend calling this endpoint no more than once every 10 seconds.
    Duplicates can occur if a user is in the requested room with multiple browser tabs opened.

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ActiveUsersResponse
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
) -> ActiveUsersResponse:
    """Get active users

     This endpoint returns a list of users currently present in the requested room. Corresponds to
    [`liveblocks.getActiveUsers`](/docs/api-reference/liveblocks-node#get-rooms-roomid-active-users).

    For optimal performance, we recommend calling this endpoint no more than once every 10 seconds.
    Duplicates can occur if a user is in the requested room with multiple browser tabs opened.

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ActiveUsersResponse
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
