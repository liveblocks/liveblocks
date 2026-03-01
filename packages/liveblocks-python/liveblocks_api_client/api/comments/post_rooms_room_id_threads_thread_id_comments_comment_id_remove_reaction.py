from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.remove_comment_reaction import RemoveCommentReaction
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    body: RemoveCommentReaction | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}/remove-reaction".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
            comment_id=quote(str(comment_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
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
    thread_id: str,
    comment_id: str,
    *,
    client: httpx.Client,
    body: RemoveCommentReaction | Unset = UNSET,
) -> Any:
    """Remove comment reaction

     This endpoint removes a comment reaction. A deleted comment reaction is no longer accessible from
    the API or the dashboard and it cannot be restored. Corresponds to
    [`liveblocks.removeCommentReaction`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-comments-commentId-add-reaction).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):
        body (RemoveCommentReaction | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: httpx.AsyncClient,
    body: RemoveCommentReaction | Unset = UNSET,
) -> Any:
    """Remove comment reaction

     This endpoint removes a comment reaction. A deleted comment reaction is no longer accessible from
    the API or the dashboard and it cannot be restored. Corresponds to
    [`liveblocks.removeCommentReaction`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-comments-commentId-add-reaction).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):
        body (RemoveCommentReaction | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return None
