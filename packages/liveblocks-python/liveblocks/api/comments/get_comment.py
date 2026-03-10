from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.comment import Comment


def _get_kwargs(
    room_id: str,
    thread_id: str,
    comment_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
            comment_id=quote(str(comment_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> Comment:
    if response.status_code == 200:
        response_200 = Comment.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: httpx.Client,
) -> Comment:
    """Get comment

     This endpoint returns a comment by its ID. Corresponds to [`liveblocks.getComment`](/docs/api-
    reference/liveblocks-node#get-rooms-roomId-threads-threadId-comments-commentId).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Comment
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: httpx.AsyncClient,
) -> Comment:
    """Get comment

     This endpoint returns a comment by its ID. Corresponds to [`liveblocks.getComment`](/docs/api-
    reference/liveblocks-node#get-rooms-roomId-threads-threadId-comments-commentId).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Comment
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
