from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.comment_metadata import CommentMetadata
from ...models.edit_comment_metadata_request_body import EditCommentMetadataRequestBody
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    body: EditCommentMetadataRequestBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}/metadata".format(
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


def _parse_response(*, response: httpx.Response) -> CommentMetadata:
    if response.status_code == 200:
        response_200 = CommentMetadata.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: httpx.Client,
    body: EditCommentMetadataRequestBody | Unset = UNSET,
) -> CommentMetadata:
    """Edit comment metadata

     This endpoint edits the metadata of a comment. The metadata is a JSON object that can be used to
    store any information you want about the comment, in `string`, `number`, or `boolean` form. Set a
    property to `null` to remove it. Corresponds to [`liveblocks.editCommentMetadata`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId-metadata).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):
        body (EditCommentMetadataRequestBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CommentMetadata
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
    body: EditCommentMetadataRequestBody | Unset = UNSET,
) -> CommentMetadata:
    """Edit comment metadata

     This endpoint edits the metadata of a comment. The metadata is a JSON object that can be used to
    store any information you want about the comment, in `string`, `number`, or `boolean` form. Set a
    property to `null` to remove it. Corresponds to [`liveblocks.editCommentMetadata`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-comments-commentId-metadata).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):
        body (EditCommentMetadataRequestBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CommentMetadata
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
