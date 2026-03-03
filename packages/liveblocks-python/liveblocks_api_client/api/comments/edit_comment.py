from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.comment import Comment
from ...models.edit_comment_request_body import EditCommentRequestBody
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    body: EditCommentRequestBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}".format(
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
    body: EditCommentRequestBody | Unset = UNSET,
) -> Comment:
    r"""Edit comment

     This endpoint edits the specified comment. Corresponds to [`liveblocks.editComment`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId).

    A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
    construct a comment’s body, which can be submitted under `body`.

    ```json
    \"version\": 1,
    \"content\": [
      {
        \"type\": \"paragraph\",
        \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
      }
    ]

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):
        body (EditCommentRequestBody | Unset):

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
    body: EditCommentRequestBody | Unset = UNSET,
) -> Comment:
    r"""Edit comment

     This endpoint edits the specified comment. Corresponds to [`liveblocks.editComment`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId).

    A comment’s body is an array of paragraphs, each containing child nodes. Here’s an example of how to
    construct a comment’s body, which can be submitted under `body`.

    ```json
    \"version\": 1,
    \"content\": [
      {
        \"type\": \"paragraph\",
        \"children\": [{ \"text\": \"Hello \" }, { \"text\": \"world\", \"bold\": true }]
      }
    ]

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):
        body (EditCommentRequestBody | Unset):

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
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
