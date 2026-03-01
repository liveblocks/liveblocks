from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.get_user_groups import GetUserGroups
from ...types import UNSET, Response, Unset


def _get_kwargs(
    user_id: str,
    *,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["startingAfter"] = starting_after

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/users/{user_id}/groups".format(
            user_id=quote(str(user_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | GetUserGroups | None:
    if response.status_code == 200:
        response_200 = GetUserGroups.from_dict(response.json())

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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | GetUserGroups]:
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
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Response[Any | GetUserGroups]:
    """Get user groups

     This endpoint returns all groups that a specific user is a member of. Corresponds to
    [`liveblocks.getUserGroups`](/docs/api-reference/liveblocks-node#get-user-groups).

    Args:
        user_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | GetUserGroups]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
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
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Any | GetUserGroups | None:
    """Get user groups

     This endpoint returns all groups that a specific user is a member of. Corresponds to
    [`liveblocks.getUserGroups`](/docs/api-reference/liveblocks-node#get-user-groups).

    Args:
        user_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | GetUserGroups
    """

    return sync_detailed(
        user_id=user_id,
        client=client,
        limit=limit,
        starting_after=starting_after,
    ).parsed


async def asyncio_detailed(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Response[Any | GetUserGroups]:
    """Get user groups

     This endpoint returns all groups that a specific user is a member of. Corresponds to
    [`liveblocks.getUserGroups`](/docs/api-reference/liveblocks-node#get-user-groups).

    Args:
        user_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | GetUserGroups]
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    user_id: str,
    *,
    client: AuthenticatedClient | Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> Any | GetUserGroups | None:
    """Get user groups

     This endpoint returns all groups that a specific user is a member of. Corresponds to
    [`liveblocks.getUserGroups`](/docs/api-reference/liveblocks-node#get-user-groups).

    Args:
        user_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | GetUserGroups
    """

    return (
        await asyncio_detailed(
            user_id=user_id,
            client=client,
            limit=limit,
            starting_after=starting_after,
        )
    ).parsed
