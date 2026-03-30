from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_feed_message_request_body import CreateFeedMessageRequestBody
from ...models.feed_message import FeedMessage


def _get_kwargs(
    room_id: str,
    feed_id: str,
    *,
    body: CreateFeedMessageRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/feeds/{feed_id}/messages".format(
            room_id=quote(str(room_id), safe=""),
            feed_id=quote(str(feed_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> FeedMessage:
    if response.status_code == 200:
        response_200 = FeedMessage.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    feed_id: str,
    *,
    client: httpx.Client,
    body: CreateFeedMessageRequestBody,
) -> FeedMessage:
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
    body: CreateFeedMessageRequestBody,
) -> FeedMessage:
    kwargs = _get_kwargs(
        room_id=room_id,
        feed_id=feed_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
