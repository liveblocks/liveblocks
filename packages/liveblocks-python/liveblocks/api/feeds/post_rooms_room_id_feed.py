from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_feed import CreateFeed
from ...models.post_rooms_room_id_feed_response_200 import PostRoomsRoomIdFeedResponse200
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: CreateFeed | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/feed".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> PostRoomsRoomIdFeedResponse200:
    if response.status_code == 200:
        response_200 = PostRoomsRoomIdFeedResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: CreateFeed | Unset = UNSET,
) -> PostRoomsRoomIdFeedResponse200:
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    body: CreateFeed | Unset = UNSET,
) -> PostRoomsRoomIdFeedResponse200:
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
