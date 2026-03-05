from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    room_id: str,
    *,
    body: Any,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/broadcast_event".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    _kwargs["json"] = body

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: Any,
) -> None:
    """Broadcast event to a room

     This endpoint enables the broadcast of an event to a room without having to connect to it via the
    `client` from `@liveblocks/client`. It takes any valid JSON as a request body. The `connectionId`
    passed to event listeners is `-1` when using this API. Corresponds to
    [`liveblocks.broadcastEvent`](/docs/api-reference/liveblocks-node#post-broadcast-event).

    Args:
        room_id (str):
        body (Any):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

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
    body: Any,
) -> None:
    """Broadcast event to a room

     This endpoint enables the broadcast of an event to a room without having to connect to it via the
    `client` from `@liveblocks/client`. It takes any valid JSON as a request body. The `connectionId`
    passed to event listeners is `-1` when using this API. Corresponds to
    [`liveblocks.broadcastEvent`](/docs/api-reference/liveblocks-node#post-broadcast-event).

    Args:
        room_id (str):
        body (Any):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
