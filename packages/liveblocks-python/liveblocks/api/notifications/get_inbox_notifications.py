from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.inbox_notification_custom_data import InboxNotificationCustomData
from ...models.inbox_notification_thread_data import InboxNotificationThreadData
from ...types import UNSET, Unset


def _get_kwargs(
    user_id: str,
    *,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    starting_after: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["organizationId"] = organization_id

    params["query"] = query

    params["limit"] = limit

    params["startingAfter"] = starting_after

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/users/{user_id}/inbox-notifications".format(
            user_id=quote(str(user_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> list[InboxNotificationCustomData | InboxNotificationThreadData]:
    if response.status_code == 200:
        response_200 = []
        _response_200 = response.json()
        for response_200_item_data in _response_200:

            def _parse_response_200_item(data: object) -> InboxNotificationCustomData | InboxNotificationThreadData:
                try:
                    if not isinstance(data, dict):
                        raise TypeError()
                    response_200_item_type_0 = InboxNotificationThreadData.from_dict(data)

                    return response_200_item_type_0
                except (TypeError, ValueError, AttributeError, KeyError):
                    pass
                if not isinstance(data, dict):
                    raise TypeError()
                response_200_item_type_1 = InboxNotificationCustomData.from_dict(data)

                return response_200_item_type_1

            response_200_item = _parse_response_200_item(response_200_item_data)

            response_200.append(response_200_item)

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    user_id: str,
    *,
    client: httpx.Client,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    starting_after: str | Unset = UNSET,
) -> list[InboxNotificationCustomData | InboxNotificationThreadData]:
    """Get all inbox notifications

     This endpoint returns all the user’s inbox notifications. Corresponds to
    [`liveblocks.getInboxNotifications`](/docs/api-reference/liveblocks-node#get-users-userId-
    inboxNotifications).

    Args:
        user_id (str):
        organization_id (str | Unset):
        query (str | Unset):
        limit (float | Unset):  Default: 50.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        list[InboxNotificationCustomData | InboxNotificationThreadData]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        organization_id=organization_id,
        query=query,
        limit=limit,
        starting_after=starting_after,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    user_id: str,
    *,
    client: httpx.AsyncClient,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    starting_after: str | Unset = UNSET,
) -> list[InboxNotificationCustomData | InboxNotificationThreadData]:
    """Get all inbox notifications

     This endpoint returns all the user’s inbox notifications. Corresponds to
    [`liveblocks.getInboxNotifications`](/docs/api-reference/liveblocks-node#get-users-userId-
    inboxNotifications).

    Args:
        user_id (str):
        organization_id (str | Unset):
        query (str | Unset):
        limit (float | Unset):  Default: 50.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        list[InboxNotificationCustomData | InboxNotificationThreadData]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        organization_id=organization_id,
        query=query,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
