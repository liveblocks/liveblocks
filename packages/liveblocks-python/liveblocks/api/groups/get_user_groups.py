from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_user_groups_response import GetUserGroupsResponse
from ...types import UNSET, Unset


def _get_kwargs(
    user_id: str,
    *,
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["startingAfter"] = starting_after

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/users/{user_id}/groups".format(
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
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
) -> GetUserGroupsResponse:
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
    limit: int | Unset = 20,
    starting_after: str | Unset = UNSET,
) -> GetUserGroupsResponse:
    kwargs = _get_kwargs(
        user_id=user_id,
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
