from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_yjs_versions import GetYjsVersions
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["cursor"] = cursor

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/versions".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetYjsVersions:
    if response.status_code == 200:
        response_200 = GetYjsVersions.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> GetYjsVersions:
    """Get Yjs version history

     This endpoint returns a list of version history snapshots for the room's Yjs document. The versions
    are returned sorted by creation date, from newest to oldest.

    Args:
        room_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetYjsVersions
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        limit=limit,
        cursor=cursor,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    limit: float | Unset = 20.0,
    cursor: str | Unset = UNSET,
) -> GetYjsVersions:
    """Get Yjs version history

     This endpoint returns a list of version history snapshots for the room's Yjs document. The versions
    are returned sorted by creation date, from newest to oldest.

    Args:
        room_id (str):
        limit (float | Unset):  Default: 20.0.
        cursor (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetYjsVersions
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        limit=limit,
        cursor=cursor,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
