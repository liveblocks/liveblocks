from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.comment import Comment
from ...models.error import Error
from ...types import Response


def _get_kwargs(
    room_id: str,
    thread_id: str,
    comment_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/threads/{thread_id}/comments/{comment_id}".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
            comment_id=quote(str(comment_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Comment | Error | None:
    if response.status_code == 200:
        response_200 = Comment.from_dict(response.json())

        return response_200

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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Comment | Error]:
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
) -> Response[Comment | Error]:
    """Get comment

     This endpoint returns a comment by its ID. Corresponds to [`liveblocks.getComment`](/docs/api-
    reference/liveblocks-node#get-rooms-roomId-threads-threadId-comments-commentId).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Comment | Error]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
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
) -> Comment | Error | None:
    """Get comment

     This endpoint returns a comment by its ID. Corresponds to [`liveblocks.getComment`](/docs/api-
    reference/liveblocks-node#get-rooms-roomId-threads-threadId-comments-commentId).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Comment | Error
    """

    return sync_detailed(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
        client=client,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Response[Comment | Error]:
    """Get comment

     This endpoint returns a comment by its ID. Corresponds to [`liveblocks.getComment`](/docs/api-
    reference/liveblocks-node#get-rooms-roomId-threads-threadId-comments-commentId).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Comment | Error]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        comment_id=comment_id,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    thread_id: str,
    comment_id: str,
    *,
    client: AuthenticatedClient | Client,
) -> Comment | Error | None:
    """Get comment

     This endpoint returns a comment by its ID. Corresponds to [`liveblocks.getComment`](/docs/api-
    reference/liveblocks-node#get-rooms-roomId-threads-threadId-comments-commentId).

    Args:
        room_id (str):
        thread_id (str):
        comment_id (str):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Comment | Error
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            thread_id=thread_id,
            comment_id=comment_id,
            client=client,
        )
    ).parsed
