from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.inbox_notification_custom_data import InboxNotificationCustomData
from ...models.inbox_notification_thread_data import InboxNotificationThreadData
from ...types import UNSET, Response, Unset


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


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Any | list[InboxNotificationCustomData | InboxNotificationThreadData] | None:
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

    if response.status_code == 401:
        response_401 = cast(Any, None)
        return response_401

    if response.status_code == 403:
        response_403 = cast(Any, None)
        return response_403

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Any | list[InboxNotificationCustomData | InboxNotificationThreadData]]:
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
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    starting_after: str | Unset = UNSET,
) -> Response[Any | list[InboxNotificationCustomData | InboxNotificationThreadData]]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | list[InboxNotificationCustomData | InboxNotificationThreadData]]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        organization_id=organization_id,
        query=query,
        limit=limit,
        starting_after=starting_after,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    starting_after: str | Unset = UNSET,
) -> Any | list[InboxNotificationCustomData | InboxNotificationThreadData] | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | list[InboxNotificationCustomData | InboxNotificationThreadData]
    """

    return sync_detailed(
        user_id=user_id,
        client=client,
        organization_id=organization_id,
        query=query,
        limit=limit,
        starting_after=starting_after,
    ).parsed


async def asyncio_detailed(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    starting_after: str | Unset = UNSET,
) -> Response[Any | list[InboxNotificationCustomData | InboxNotificationThreadData]]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | list[InboxNotificationCustomData | InboxNotificationThreadData]]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        organization_id=organization_id,
        query=query,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    limit: float | Unset = 50.0,
    starting_after: str | Unset = UNSET,
) -> Any | list[InboxNotificationCustomData | InboxNotificationThreadData] | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | list[InboxNotificationCustomData | InboxNotificationThreadData]
    """

    return (
        await asyncio_detailed(
            user_id=user_id,
            client=client,
            organization_id=organization_id,
            query=query,
            limit=limit,
            starting_after=starting_after,
        )
    ).parsed
