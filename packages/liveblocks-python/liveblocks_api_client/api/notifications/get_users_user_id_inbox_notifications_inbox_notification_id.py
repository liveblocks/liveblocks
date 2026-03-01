from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.inbox_notification_custom_data import InboxNotificationCustomData
from ...models.inbox_notification_thread_data import InboxNotificationThreadData
from ...types import Response


def _get_kwargs(
    user_id: str,
    inbox_notification_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/users/{user_id}/inbox-notifications/{inbox_notification_id}".format(
            user_id=quote(str(user_id), safe=""),
            inbox_notification_id=quote(str(inbox_notification_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | InboxNotificationCustomData | InboxNotificationThreadData | None:
    if response.status_code == 200:

        def _parse_response_200(data: object) -> InboxNotificationCustomData | InboxNotificationThreadData:
            try:
                if not isinstance(data, dict):
                    raise TypeError()
                response_200_type_0 = InboxNotificationThreadData.from_dict(data)

                return response_200_type_0
            except (TypeError, ValueError, AttributeError, KeyError):
                pass
            if not isinstance(data, dict):
                raise TypeError()
            response_200_type_1 = InboxNotificationCustomData.from_dict(data)

            return response_200_type_1

        response_200 = _parse_response_200(response.json())

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
) -> Response[Any | InboxNotificationCustomData | InboxNotificationThreadData]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    user_id: str,
    inbox_notification_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | InboxNotificationCustomData | InboxNotificationThreadData]:
    """Get inbox notification

     This endpoint returns a user’s inbox notification by its ID. Corresponds to
    [`liveblocks.getInboxNotification`](/docs/api-reference/liveblocks-node#get-users-userId-
    inboxNotifications-inboxNotificationId).

    Args:
        user_id (str):
        inbox_notification_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | InboxNotificationCustomData | InboxNotificationThreadData]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        inbox_notification_id=inbox_notification_id,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    user_id: str,
    inbox_notification_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | InboxNotificationCustomData | InboxNotificationThreadData | None:
    """Get inbox notification

     This endpoint returns a user’s inbox notification by its ID. Corresponds to
    [`liveblocks.getInboxNotification`](/docs/api-reference/liveblocks-node#get-users-userId-
    inboxNotifications-inboxNotificationId).

    Args:
        user_id (str):
        inbox_notification_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | InboxNotificationCustomData | InboxNotificationThreadData
    """

    return sync_detailed(
        user_id=user_id,
        inbox_notification_id=inbox_notification_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    user_id: str,
    inbox_notification_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Any | InboxNotificationCustomData | InboxNotificationThreadData]:
    """Get inbox notification

     This endpoint returns a user’s inbox notification by its ID. Corresponds to
    [`liveblocks.getInboxNotification`](/docs/api-reference/liveblocks-node#get-users-userId-
    inboxNotifications-inboxNotificationId).

    Args:
        user_id (str):
        inbox_notification_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | InboxNotificationCustomData | InboxNotificationThreadData]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        inbox_notification_id=inbox_notification_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    user_id: str,
    inbox_notification_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Any | InboxNotificationCustomData | InboxNotificationThreadData | None:
    """Get inbox notification

     This endpoint returns a user’s inbox notification by its ID. Corresponds to
    [`liveblocks.getInboxNotification`](/docs/api-reference/liveblocks-node#get-users-userId-
    inboxNotifications-inboxNotificationId).

    Args:
        user_id (str):
        inbox_notification_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | InboxNotificationCustomData | InboxNotificationThreadData
    """

    return (
        await asyncio_detailed(
            user_id=user_id,
            inbox_notification_id=inbox_notification_id,
            client=client,
        )
    ).parsed
