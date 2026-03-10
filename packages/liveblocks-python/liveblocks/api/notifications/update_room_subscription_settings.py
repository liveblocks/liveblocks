from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.room_subscription_settings import RoomSubscriptionSettings
from ...models.update_room_subscription_settings_request_body import UpdateRoomSubscriptionSettingsRequestBody


def _get_kwargs(
    room_id: str,
    user_id: str,
    *,
    body: UpdateRoomSubscriptionSettingsRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/users/{user_id}/subscription-settings".format(
            room_id=quote(str(room_id), safe=""),
            user_id=quote(str(user_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> RoomSubscriptionSettings:
    if response.status_code == 200:
        response_200 = RoomSubscriptionSettings.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    user_id: str,
    *,
    client: httpx.Client,
    body: UpdateRoomSubscriptionSettingsRequestBody,
) -> RoomSubscriptionSettings:
    """Update room subscription settings

     This endpoint updates a user’s subscription settings for a specific room. Corresponds to
    [`liveblocks.updateRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#post-rooms-roomId-
    users-userId-subscription-settings).

    Args:
        room_id (str):
        user_id (str):
        body (UpdateRoomSubscriptionSettingsRequestBody): Partial room subscription settings - all
            properties are optional

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        RoomSubscriptionSettings
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
        body=body,
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
    body: UpdateRoomSubscriptionSettingsRequestBody,
) -> RoomSubscriptionSettings:
    """Update room subscription settings

     This endpoint updates a user’s subscription settings for a specific room. Corresponds to
    [`liveblocks.updateRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#post-rooms-roomId-
    users-userId-subscription-settings).

    Args:
        room_id (str):
        user_id (str):
        body (UpdateRoomSubscriptionSettingsRequestBody): Partial room subscription settings - all
            properties are optional

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        RoomSubscriptionSettings
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
