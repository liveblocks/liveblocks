from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.add_comment_reaction_request_body import AddCommentReactionRequestBody
from ...models.comment_reaction import CommentReaction


def _get_kwargs(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    body: AddCommentReactionRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}/add-reaction".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
            comment_id=quote(str(comment_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> CommentReaction:
    if response.status_code == 200:
        response_200 = CommentReaction.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: httpx.Client,
    body: AddCommentReactionRequestBody,
) -> CommentReaction:
    """Add comment reaction

     This endpoint adds a reaction to a comment. Corresponds to
    [`liveblocks.addCommentReaction`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-comments-commentId-add-reaction).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):
        body (AddCommentReactionRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CommentReaction
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
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: httpx.AsyncClient,
    body: AddCommentReactionRequestBody,
) -> CommentReaction:
    """Add comment reaction

     This endpoint adds a reaction to a comment. Corresponds to
    [`liveblocks.addCommentReaction`](/docs/api-reference/liveblocks-node#post-rooms-roomId-threads-
    threadId-comments-commentId-add-reaction).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):
        body (AddCommentReactionRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CommentReaction
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

    return _parse_response(response=response)
