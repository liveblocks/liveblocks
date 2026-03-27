from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_feed_message import CreateFeedMessage
from ...models.post_rooms_room_id_feeds_feed_id_messages_response_200 import (
    PostRoomsRoomIdFeedsFeedIdMessagesResponse200,
)
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    feed_id: str,
    *,
    body: CreateFeedMessage | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/feeds/{feed_id}/messages".format(
            room_id=quote(str(room_id), safe=""),
            feed_id=quote(str(feed_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> PostRoomsRoomIdFeedsFeedIdMessagesResponse200:
    if response.status_code == 200:
        response_200 = PostRoomsRoomIdFeedsFeedIdMessagesResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    feed_id: str,
    *,
    client: httpx.Client,
    body: CreateFeedMessage | Unset = UNSET,
) -> PostRoomsRoomIdFeedsFeedIdMessagesResponse200:
    kwargs = _get_kwargs(
        room_id=room_id,
        feed_id=feed_id,
        body=body,
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
    body: CreateFeedMessage | Unset = UNSET,
) -> PostRoomsRoomIdFeedsFeedIdMessagesResponse200:
    kwargs = _get_kwargs(
        room_id=room_id,
        feed_id=feed_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
