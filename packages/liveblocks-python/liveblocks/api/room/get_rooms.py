from typing import Any

import httpx

from ... import errors
from ...models.get_rooms_response import GetRoomsResponse
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    user_id: str | Unset = UNSET,
    group_ids: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["startingAfter"] = starting_after

    params["organizationId"] = organization_id

    params["query"] = query

    params["userId"] = user_id

    params["groupIds"] = group_ids

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms",
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetRoomsResponse:
    if response.status_code == 200:
        response_200 = GetRoomsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    user_id: str | Unset = UNSET,
    group_ids: str | Unset = UNSET,
) -> GetRoomsResponse:
    """Get rooms

     This endpoint returns a list of your rooms. The rooms are returned sorted by creation date, from
    newest to oldest. You can filter rooms by room ID prefixes, metadata, users accesses, and groups
    accesses. Corresponds to [`liveblocks.getRooms`](/docs/api-reference/liveblocks-node#get-rooms).

    There is a pagination system where the cursor to the next page is returned in the response as
    `nextCursor`, which can be combined with `startingAfter`.
    You can also limit the number of rooms by query.

    Filtering by metadata works by giving key values like `metadata.color=red`. Of course you can
    combine multiple metadata clauses to refine the response like
    `metadata.color=red&metadata.type=text`. Notice here the operator AND is applied between each
    clauses.

    Filtering by groups or userId works by giving a list of groups like
    `groupIds=marketing,GZo7tQ,product` or/and a userId like `userId=user1`.
    Notice here the operator OR is applied between each `groupIds` and the `userId`.

    Args:
        limit (int | Unset):  Default: 20.
        starting_after (str | Unset):
        organization_id (str | Unset):
        query (str | Unset):
        user_id (str | Unset):
        group_ids (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetRoomsResponse
    """

    kwargs = _get_kwargs(
        limit=limit,
        starting_after=starting_after,
        organization_id=organization_id,
        query=query,
        user_id=user_id,
        group_ids=group_ids,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
    organization_id: str | Unset = UNSET,
    query: str | Unset = UNSET,
    user_id: str | Unset = UNSET,
    group_ids: str | Unset = UNSET,
) -> GetRoomsResponse:
    """Get rooms

     This endpoint returns a list of your rooms. The rooms are returned sorted by creation date, from
    newest to oldest. You can filter rooms by room ID prefixes, metadata, users accesses, and groups
    accesses. Corresponds to [`liveblocks.getRooms`](/docs/api-reference/liveblocks-node#get-rooms).

    There is a pagination system where the cursor to the next page is returned in the response as
    `nextCursor`, which can be combined with `startingAfter`.
    You can also limit the number of rooms by query.

    Filtering by metadata works by giving key values like `metadata.color=red`. Of course you can
    combine multiple metadata clauses to refine the response like
    `metadata.color=red&metadata.type=text`. Notice here the operator AND is applied between each
    clauses.

    Filtering by groups or userId works by giving a list of groups like
    `groupIds=marketing,GZo7tQ,product` or/and a userId like `userId=user1`.
    Notice here the operator OR is applied between each `groupIds` and the `userId`.

    Args:
        limit (int | Unset):  Default: 20.
        starting_after (str | Unset):
        organization_id (str | Unset):
        query (str | Unset):
        user_id (str | Unset):
        group_ids (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetRoomsResponse
    """

    kwargs = _get_kwargs(
        limit=limit,
        starting_after=starting_after,
        organization_id=organization_id,
        query=query,
        user_id=user_id,
        group_ids=group_ids,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
