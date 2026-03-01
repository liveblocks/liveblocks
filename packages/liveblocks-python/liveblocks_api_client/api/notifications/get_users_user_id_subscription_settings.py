from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_users_user_id_subscription_settings_response_200 import GetUsersUserIdSubscriptionSettingsResponse200
from ...types import UNSET, Response, Unset


def _get_kwargs(
    user_id: str,
    *,
    starting_after: str | Unset = UNSET,
    limit: float | Unset = 50.0,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["startingAfter"] = starting_after

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/users/{user_id}/room-subscription-settings".format(
            user_id=quote(str(user_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | GetUsersUserIdSubscriptionSettingsResponse200 | None:
    if response.status_code == 200:
        response_200 = GetUsersUserIdSubscriptionSettingsResponse200.from_dict(response.json())

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
) -> Response[Any | GetUsersUserIdSubscriptionSettingsResponse200]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    starting_after: str | Unset = UNSET,
    limit: float | Unset = 50.0,
) -> Response[Any | GetUsersUserIdSubscriptionSettingsResponse200]:
    """Get user room subscription settings

     This endpoint returns the list of a user's room subscription settings. Corresponds to
    [`liveblocks.getUserRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#get-users-userId-
    room-subscription-settings).

    Args:
        user_id (str):
        starting_after (str | Unset):
        limit (float | Unset):  Default: 50.0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | GetUsersUserIdSubscriptionSettingsResponse200]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        starting_after=starting_after,
        limit=limit,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    starting_after: str | Unset = UNSET,
    limit: float | Unset = 50.0,
) -> Any | GetUsersUserIdSubscriptionSettingsResponse200 | None:
    """Get user room subscription settings

     This endpoint returns the list of a user's room subscription settings. Corresponds to
    [`liveblocks.getUserRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#get-users-userId-
    room-subscription-settings).

    Args:
        user_id (str):
        starting_after (str | Unset):
        limit (float | Unset):  Default: 50.0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | GetUsersUserIdSubscriptionSettingsResponse200
    """

    return sync_detailed(
        user_id=user_id,
        client=client,
        starting_after=starting_after,
        limit=limit,
    ).parsed


async def asyncio_detailed(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    starting_after: str | Unset = UNSET,
    limit: float | Unset = 50.0,
) -> Response[Any | GetUsersUserIdSubscriptionSettingsResponse200]:
    """Get user room subscription settings

     This endpoint returns the list of a user's room subscription settings. Corresponds to
    [`liveblocks.getUserRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#get-users-userId-
    room-subscription-settings).

    Args:
        user_id (str):
        starting_after (str | Unset):
        limit (float | Unset):  Default: 50.0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | GetUsersUserIdSubscriptionSettingsResponse200]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        starting_after=starting_after,
        limit=limit,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    starting_after: str | Unset = UNSET,
    limit: float | Unset = 50.0,
) -> Any | GetUsersUserIdSubscriptionSettingsResponse200 | None:
    """Get user room subscription settings

     This endpoint returns the list of a user's room subscription settings. Corresponds to
    [`liveblocks.getUserRoomSubscriptionSettings`](/docs/api-reference/liveblocks-node#get-users-userId-
    room-subscription-settings).

    Args:
        user_id (str):
        starting_after (str | Unset):
        limit (float | Unset):  Default: 50.0.

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | GetUsersUserIdSubscriptionSettingsResponse200
    """

    return (
        await asyncio_detailed(
            user_id=user_id,
            client=client,
            starting_after=starting_after,
            limit=limit,
        )
    ).parsed
