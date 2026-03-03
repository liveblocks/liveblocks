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
        "url": "/rooms/{room_id}/users/{user_id}/notification-settings".format(
            room_id=quote(str(room_id), safe=""),
            user_id=quote(str(user_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    user_id: str,
    *,
    client: httpx.Client,
) -> None:
    """Delete room notification settings

     **Deprecated.** Renamed to [`/subscription-settings`](delete-rooms-roomId-users-userId-subscription-
    settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

    This endpoint deletes a user’s notification settings for a specific room. Corresponds to
    [`liveblocks.deleteRoomNotificationSettings`](/docs/api-reference/liveblocks-node#delete-rooms-
    roomId-users-userId-notification-settings).

    Args:
        room_id (str):
        user_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Delete room notification settings

     **Deprecated.** Renamed to [`/subscription-settings`](delete-rooms-roomId-users-userId-subscription-
    settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

    This endpoint deletes a user’s notification settings for a specific room. Corresponds to
    [`liveblocks.deleteRoomNotificationSettings`](/docs/api-reference/liveblocks-node#delete-rooms-
    roomId-users-userId-notification-settings).

    Args:
        room_id (str):
        user_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
