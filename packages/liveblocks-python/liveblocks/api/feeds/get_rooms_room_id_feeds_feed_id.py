from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_rooms_room_id_feeds_feed_id_response_200 import GetRoomsRoomIdFeedsFeedIdResponse200


def _get_kwargs(
    room_id: str,
    feed_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/feeds/{feed_id}".format(
            room_id=quote(str(room_id), safe=""),
            feed_id=quote(str(feed_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetRoomsRoomIdFeedsFeedIdResponse200:
    if response.status_code == 200:
        response_200 = GetRoomsRoomIdFeedsFeedIdResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    feed_id: str,
    *,
    client: httpx.Client,
) -> GetRoomsRoomIdFeedsFeedIdResponse200:
    kwargs = _get_kwargs(
        room_id=room_id,
        feed_id=feed_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    feed_id: str,
    *,
    client: httpx.AsyncClient,
) -> GetRoomsRoomIdFeedsFeedIdResponse200:
    kwargs = _get_kwargs(
        room_id=room_id,
        feed_id=feed_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
