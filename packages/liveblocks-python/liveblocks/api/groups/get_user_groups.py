from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_user_groups_response import GetUserGroupsResponse
from ...types import UNSET, Unset


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


def _parse_response(*, response: httpx.Response) -> GetUserGroupsResponse:
    if response.status_code == 200:
        response_200 = GetUserGroupsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    user_id: str,
    *,
    client: httpx.Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> GetUserGroupsResponse:
    """Get user groups

     This endpoint returns all groups that a specific user is a member of. Corresponds to
    [`liveblocks.getUserGroups`](/docs/api-reference/liveblocks-node#get-user-groups).

    Args:
        user_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetUserGroupsResponse
    """

    kwargs = _get_kwargs(
        user_id=user_id,
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
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> GetUserGroupsResponse:
    """Get user groups

     This endpoint returns all groups that a specific user is a member of. Corresponds to
    [`liveblocks.getUserGroups`](/docs/api-reference/liveblocks-node#get-user-groups).

    Args:
        user_id (str):
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetUserGroupsResponse
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
