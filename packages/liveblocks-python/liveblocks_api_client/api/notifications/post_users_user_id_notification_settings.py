from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.notification_settings import NotificationSettings
from ...models.partial_notification_settings import PartialNotificationSettings
from ...types import UNSET, Response, Unset


def _get_kwargs(
    user_id: str,
    *,
    body: PartialNotificationSettings | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/users/{user_id}/notification-settings".format(
            user_id=quote(str(user_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | NotificationSettings | None:
    if response.status_code == 200:
        response_200 = NotificationSettings.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 422:
        response_422 = Error.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | NotificationSettings]:
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
    body: PartialNotificationSettings | Unset = UNSET,
) -> Response[Error | NotificationSettings]:
    """Update notification settings

     This endpoint updates a user's notification settings for the project. Corresponds to
    [`liveblocks.updateNotificationSettings`](/docs/api-reference/liveblocks-node#post-users-userId-
    notification-settings).

    Args:
        user_id (str):
        body (PartialNotificationSettings | Unset): Partial notification settings - all properties
            are optional

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | NotificationSettings]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: PartialNotificationSettings | Unset = UNSET,
) -> Error | NotificationSettings | None:
    """Update notification settings

     This endpoint updates a user's notification settings for the project. Corresponds to
    [`liveblocks.updateNotificationSettings`](/docs/api-reference/liveblocks-node#post-users-userId-
    notification-settings).

    Args:
        user_id (str):
        body (PartialNotificationSettings | Unset): Partial notification settings - all properties
            are optional

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | NotificationSettings
    """

    return sync_detailed(
        user_id=user_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: PartialNotificationSettings | Unset = UNSET,
) -> Response[Error | NotificationSettings]:
    """Update notification settings

     This endpoint updates a user's notification settings for the project. Corresponds to
    [`liveblocks.updateNotificationSettings`](/docs/api-reference/liveblocks-node#post-users-userId-
    notification-settings).

    Args:
        user_id (str):
        body (PartialNotificationSettings | Unset): Partial notification settings - all properties
            are optional

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | NotificationSettings]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: PartialNotificationSettings | Unset = UNSET,
) -> Error | NotificationSettings | None:
    """Update notification settings

     This endpoint updates a user's notification settings for the project. Corresponds to
    [`liveblocks.updateNotificationSettings`](/docs/api-reference/liveblocks-node#post-users-userId-
    notification-settings).

    Args:
        user_id (str):
        body (PartialNotificationSettings | Unset): Partial notification settings - all properties
            are optional

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | NotificationSettings
    """

    return (
        await asyncio_detailed(
            user_id=user_id,
            client=client,
            body=body,
        )
    ).parsed
