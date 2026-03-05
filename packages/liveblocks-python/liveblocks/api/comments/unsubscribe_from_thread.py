from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.unsubscribe_from_thread_request_body import UnsubscribeFromThreadRequestBody


def _get_kwargs(
    room_id: str,
    thread_id: str,
    *,
    body: UnsubscribeFromThreadRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/unsubscribe".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

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
    thread_id: str,
    *,
    client: httpx.Client,
    body: UnsubscribeFromThreadRequestBody,
) -> None:
    """Unsubscribe from thread

     This endpoint unsubscribes from a thread. Corresponds to
    [`liveblocks.unsubscribeFromThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-unsubscribe).

    Args:
        room_id (str):
        thread_id (str):
        body (UnsubscribeFromThreadRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.AsyncClient,
    body: UnsubscribeFromThreadRequestBody,
) -> None:
    """Unsubscribe from thread

     This endpoint unsubscribes from a thread. Corresponds to
    [`liveblocks.unsubscribeFromThread`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-unsubscribe).

    Args:
        room_id (str):
        thread_id (str):
        body (UnsubscribeFromThreadRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
