from typing import Any

import httpx

from ... import errors
from ...models.get_groups import GetGroups
from ...types import UNSET, Unset


def _get_kwargs(
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
        "url": "/groups",
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetGroups:
    if response.status_code == 200:
        response_200 = GetGroups.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> GetGroups:
    """Get groups

     This endpoint returns a list of all groups in your project. Corresponds to
    [`liveblocks.getGroups`](/docs/api-reference/liveblocks-node#get-groups).

    Args:
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetGroups
    """

    kwargs = _get_kwargs(
        limit=limit,
        starting_after=starting_after,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    limit: float | Unset = 20.0,
    starting_after: str | Unset = UNSET,
) -> GetGroups:
    """Get groups

     This endpoint returns a list of all groups in your project. Corresponds to
    [`liveblocks.getGroups`](/docs/api-reference/liveblocks-node#get-groups).

    Args:
        limit (float | Unset):  Default: 20.0.
        starting_after (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetGroups
    """

    kwargs = _get_kwargs(
        limit=limit,
        starting_after=starting_after,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
