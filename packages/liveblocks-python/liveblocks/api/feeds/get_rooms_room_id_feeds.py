from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_rooms_room_id_feeds_response_200 import GetRoomsRoomIdFeedsResponse200
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    cursor: str | Unset = UNSET,
    since: float | Unset = UNSET,
    limit: float | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["cursor"] = cursor

    params["since"] = since

    params["limit"] = limit

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/feeds".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetRoomsRoomIdFeedsResponse200:
    if response.status_code == 200:
        response_200 = GetRoomsRoomIdFeedsResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    cursor: str | Unset = UNSET,
    since: float | Unset = UNSET,
    limit: float | Unset = UNSET,
) -> GetRoomsRoomIdFeedsResponse200:
    kwargs = _get_kwargs(
        room_id=room_id,
        cursor=cursor,
        since=since,
        limit=limit,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    cursor: str | Unset = UNSET,
    since: float | Unset = UNSET,
    limit: float | Unset = UNSET,
) -> GetRoomsRoomIdFeedsResponse200:
    kwargs = _get_kwargs(
        room_id=room_id,
        cursor=cursor,
        since=since,
        limit=limit,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
