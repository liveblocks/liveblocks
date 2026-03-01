from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.inbox_notification_custom_data import InboxNotificationCustomData
from ...models.inbox_notification_thread_data import InboxNotificationThreadData


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


def _parse_response(*, response: httpx.Response) -> InboxNotificationCustomData | InboxNotificationThreadData:
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

    raise errors.LiveblocksError.from_response(response)


def _sync(
    user_id: str,
    inbox_notification_id: str,
    *,
    client: httpx.Client,
) -> InboxNotificationCustomData | InboxNotificationThreadData:
    """Get inbox notification

     This endpoint returns a user’s inbox notification by its ID. Corresponds to
    [`liveblocks.getInboxNotification`](/docs/api-reference/liveblocks-node#get-users-userId-
    inboxNotifications-inboxNotificationId).

    Args:
        user_id (str):
        inbox_notification_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        InboxNotificationCustomData | InboxNotificationThreadData
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        inbox_notification_id=inbox_notification_id,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    user_id: str,
    inbox_notification_id: str,
    *,
    client: httpx.AsyncClient,
) -> InboxNotificationCustomData | InboxNotificationThreadData:
    """Get inbox notification

     This endpoint returns a user’s inbox notification by its ID. Corresponds to
    [`liveblocks.getInboxNotification`](/docs/api-reference/liveblocks-node#get-users-userId-
    inboxNotifications-inboxNotificationId).

    Args:
        user_id (str):
        inbox_notification_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        InboxNotificationCustomData | InboxNotificationThreadData
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        inbox_notification_id=inbox_notification_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
