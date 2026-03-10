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
        "url": "/v2/rooms",
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
