from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    query: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["query"] = query

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/threads".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    query: str | Unset = UNSET,
) -> None:
    """Get room threads

     This endpoint returns the threads in the requested room. Corresponds to
    [`liveblocks.getThreads`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads).

    Args:
        room_id (str):
        query (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        query=query,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    query: str | Unset = UNSET,
) -> None:
    """Get room threads

     This endpoint returns the threads in the requested room. Corresponds to
    [`liveblocks.getThreads`](/docs/api-reference/liveblocks-node#get-rooms-roomId-threads).

    Args:
        room_id (str):
        query (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        query=query,
    )

    response = await client.request(
        **kwargs,
    )

    return None
