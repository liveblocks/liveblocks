from http import HTTPStatus
from typing import Any, cast
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.remove_comment_reaction import RemoveCommentReaction
from ...types import UNSET, Response, Unset


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


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | Error | None:
    if response.status_code == 204:
        response_204 = cast(Any, None)
        return response_204

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: RemoveCommentReaction | Unset = UNSET,
) -> Response[Any | Error]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: RemoveCommentReaction | Unset = UNSET,
) -> Any | Error | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error
    """

    return sync_detailed(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: RemoveCommentReaction | Unset = UNSET,
) -> Response[Any | Error]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: RemoveCommentReaction | Unset = UNSET,
) -> Any | Error | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=client,
            body=body,
        )
    ).parsed
