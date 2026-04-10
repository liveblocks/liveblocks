from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.feed_message import FeedMessage
from ...models.update_feed_message_request_body import UpdateFeedMessageRequestBody


def _get_kwargs(
    room_id: str,
    feed_id: str,
    message_id: str,
    *,
    body: UpdateFeedMessageRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/v2/rooms/{room_id}/feeds/{feed_id}/messages/{message_id}".format(
            room_id=quote(str(room_id), safe=""),
            feed_id=quote(str(feed_id), safe=""),
            message_id=quote(str(message_id), safe=""),
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
    message_id: str,
    *,
    client: httpx.Client,
    body: UpdateFeedMessageRequestBody,
) -> FeedMessage:
    kwargs = _get_kwargs(
        room_id=room_id,
        feed_id=feed_id,
        message_id=message_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    feed_id: str,
    message_id: str,
    *,
    client: httpx.AsyncClient,
    body: UpdateFeedMessageRequestBody,
) -> FeedMessage:
    kwargs = _get_kwargs(
        room_id=room_id,
        feed_id=feed_id,
        message_id=message_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
