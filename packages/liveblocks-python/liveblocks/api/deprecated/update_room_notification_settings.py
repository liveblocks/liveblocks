from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.room_subscription_settings import RoomSubscriptionSettings
from ...models.update_room_subscription_settings_request_body import UpdateRoomSubscriptionSettingsRequestBody
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    user_id: str,
    *,
    body: UpdateRoomSubscriptionSettingsRequestBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/users/{user_id}/notification-settings".format(
            room_id=quote(str(room_id), safe=""),
            user_id=quote(str(user_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
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
    body: UpdateRoomSubscriptionSettingsRequestBody | Unset = UNSET,
) -> RoomSubscriptionSettings:
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
    body: UpdateRoomSubscriptionSettingsRequestBody | Unset = UNSET,
) -> RoomSubscriptionSettings:
    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
