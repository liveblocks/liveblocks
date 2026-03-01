from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.room_subscription_settings import RoomSubscriptionSettings
from ...types import Response


def _get_kwargs(
    room_id: str,
    user_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/users/{user_id}/notification-settings".format(
            room_id=quote(str(room_id), safe=""),
            user_id=quote(str(user_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | RoomSubscriptionSettings | None:
    if response.status_code == 200:
        response_200 = RoomSubscriptionSettings.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = cast(Any, None)
        return response_401

    if response.status_code == 403:
        response_403 = cast(Any, None)
        return response_403

    if response.status_code == 404:
        response_404 = cast(Any, None)
        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | RoomSubscriptionSettings]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    room_id: str,
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | RoomSubscriptionSettings]:
    """Get room notification settings

     **Deprecated.** Renamed to [`/subscription-settings`](get-rooms-roomId-users-userId-subscription-
    settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

    This endpoint returns a user’s subscription settings for a specific room. Corresponds to
    [`liveblocks.getRoomNotificationSettings`](/docs/api-reference/liveblocks-node#get-rooms-roomId-
    users-userId-notification-settings).

    Args:
        room_id (str):
        user_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | RoomSubscriptionSettings]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | RoomSubscriptionSettings | None:
    """Get room notification settings

     **Deprecated.** Renamed to [`/subscription-settings`](get-rooms-roomId-users-userId-subscription-
    settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

    This endpoint returns a user’s subscription settings for a specific room. Corresponds to
    [`liveblocks.getRoomNotificationSettings`](/docs/api-reference/liveblocks-node#get-rooms-roomId-
    users-userId-notification-settings).

    Args:
        room_id (str):
        user_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | RoomSubscriptionSettings
    """

    return sync_detailed(
        room_id=room_id,
        user_id=user_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | RoomSubscriptionSettings]:
    """Get room notification settings

     **Deprecated.** Renamed to [`/subscription-settings`](get-rooms-roomId-users-userId-subscription-
    settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

    This endpoint returns a user’s subscription settings for a specific room. Corresponds to
    [`liveblocks.getRoomNotificationSettings`](/docs/api-reference/liveblocks-node#get-rooms-roomId-
    users-userId-notification-settings).

    Args:
        room_id (str):
        user_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | RoomSubscriptionSettings]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        user_id=user_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | RoomSubscriptionSettings | None:
    """Get room notification settings

     **Deprecated.** Renamed to [`/subscription-settings`](get-rooms-roomId-users-userId-subscription-
    settings). Read more in our [migration guide](/docs/platform/upgrading/2.24).

    This endpoint returns a user’s subscription settings for a specific room. Corresponds to
    [`liveblocks.getRoomNotificationSettings`](/docs/api-reference/liveblocks-node#get-rooms-roomId-
    users-userId-notification-settings).

    Args:
        room_id (str):
        user_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | RoomSubscriptionSettings
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            user_id=user_id,
            client=client,
        )
    ).parsed
