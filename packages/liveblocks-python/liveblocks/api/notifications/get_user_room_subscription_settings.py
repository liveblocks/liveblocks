from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_room_subscription_settings_response import GetRoomSubscriptionSettingsResponse
from ...types import UNSET, Unset


def _get_kwargs(
    user_id: str,
    *,
    starting_after: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    organization_id: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["startingAfter"] = starting_after

    params["limit"] = limit

    params["organizationId"] = organization_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/users/{user_id}/room-subscription-settings".format(
            user_id=quote(str(user_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetRoomSubscriptionSettingsResponse:
    if response.status_code == 200:
        response_200 = GetRoomSubscriptionSettingsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    user_id: str,
    *,
    client: httpx.Client,
    starting_after: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    organization_id: str | Unset = UNSET,
) -> GetRoomSubscriptionSettingsResponse:
    """Get user room subscription settings

     This endpoint returns the list of a user's room subscription settings. Corresponds to
    [`liveblocks.getUserRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#get-users-userId-
    room-subscription-settings).

    Args:
        user_id (str):
        starting_after (str | Unset):
        limit (float | Unset):  Default: 50.0.
        organization_id (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetRoomSubscriptionSettingsResponse
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        starting_after=starting_after,
        limit=limit,
        organization_id=organization_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    user_id: str,
    *,
    client: httpx.AsyncClient,
    starting_after: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    organization_id: str | Unset = UNSET,
) -> GetRoomSubscriptionSettingsResponse:
    """Get user room subscription settings

     This endpoint returns the list of a user's room subscription settings. Corresponds to
    [`liveblocks.getUserRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#get-users-userId-
    room-subscription-settings).

    Args:
        user_id (str):
        starting_after (str | Unset):
        limit (float | Unset):  Default: 50.0.
        organization_id (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetRoomSubscriptionSettingsResponse
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        starting_after=starting_after,
        limit=limit,
        organization_id=organization_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
