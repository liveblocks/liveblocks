from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    room_id: str,
    user_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/rooms/{room_id}/users/{user_id}/subscription-settings".format(
            room_id=quote(str(room_id), safe=""),
            user_id=quote(str(user_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    user_id: str,
    *,
    client: httpx.Client,
) -> Any:
    """Delete room subscription settings

     This endpoint deletes a user’s subscription settings for a specific room. Corresponds to
    [`liveblocks.deleteRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#delete-rooms-
    roomId-users-userId-subscription-settings).

    Args:
        room_id (str):
        user_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    room_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> Any:
    """Delete room subscription settings

     This endpoint deletes a user’s subscription settings for a specific room. Corresponds to
    [`liveblocks.deleteRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#delete-rooms-
    roomId-users-userId-subscription-settings).

    Args:
        room_id (str):
        user_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
    )

    response = await client.request(
        **kwargs,
    )

    return None
