from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.update_feed import UpdateFeed
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    feed_id: str,
    *,
    body: UpdateFeed | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "patch",
        "url": "/v2/rooms/{room_id}/feeds/{feed_id}".format(
            room_id=quote(str(room_id), safe=""),
            feed_id=quote(str(feed_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    feed_id: str,
    *,
    client: httpx.Client,
    body: UpdateFeed | Unset = UNSET,
) -> None:
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
    body: UpdateFeed | Unset = UNSET,
) -> None:
    kwargs = _get_kwargs(
        room_id=room_id,
        feed_id=feed_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
