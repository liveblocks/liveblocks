from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.set_presence import SetPresence


def _get_kwargs(
    room_id: str,
    *,
    body: SetPresence,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/presence".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: SetPresence,
) -> Any:
    """Set ephemeral presence

     This endpoint sets ephemeral presence for a user in a room without requiring a WebSocket connection.
    The presence data will automatically expire after the specified TTL (time-to-live). This is useful
    for scenarios like showing an AI agent's presence in a room. The presence will be broadcast to all
    connected users in the room.

    Args:
        room_id (str):
        body (SetPresence):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    body: SetPresence,
) -> Any:
    """Set ephemeral presence

     This endpoint sets ephemeral presence for a user in a room without requiring a WebSocket connection.
    The presence data will automatically expire after the specified TTL (time-to-live). This is useful
    for scenarios like showing an AI agent's presence in a room. The presence will be broadcast to all
    connected users in the room.

    Args:
        room_id (str):
        body (SetPresence):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return None
