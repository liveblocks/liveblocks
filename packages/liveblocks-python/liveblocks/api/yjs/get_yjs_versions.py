from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_yjs_versions_response import GetYjsVersionsResponse
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    limit: int | Unset = 20,
    cursor: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["limit"] = limit

    params["cursor"] = cursor

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/versions".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetYjsVersionsResponse:
    if response.status_code == 200:
        response_200 = GetYjsVersionsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    limit: int | Unset = 20,
    cursor: str | Unset = UNSET,
) -> GetYjsVersionsResponse:
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
    limit: int | Unset = 20,
    cursor: str | Unset = UNSET,
) -> GetYjsVersionsResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
        limit=limit,
        cursor=cursor,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
