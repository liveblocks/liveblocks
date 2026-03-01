from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.thread_metadata import ThreadMetadata
from ...models.update_thread_metadata import UpdateThreadMetadata
from ...types import UNSET, Response, Unset


def _get_kwargs(
    room_id: str,
    thread_id: str,
    *,
    body: UpdateThreadMetadata | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/metadata".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | ThreadMetadata | None:
    if response.status_code == 200:
        response_200 = ThreadMetadata.from_dict(response.json())

        return response_200

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


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | ThreadMetadata]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateThreadMetadata | Unset = UNSET,
) -> Response[Error | ThreadMetadata]:
    """Edit thread metadata

     This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to
    store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a
    property to `null` to remove it. Corresponds to [`liveblocks.editThreadMetadata`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-metadata).

    Args:
        room_id (str):
        thread_id (str):
        body (UpdateThreadMetadata | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ThreadMetadata]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateThreadMetadata | Unset = UNSET,
) -> Error | ThreadMetadata | None:
    """Edit thread metadata

     This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to
    store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a
    property to `null` to remove it. Corresponds to [`liveblocks.editThreadMetadata`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-metadata).

    Args:
        room_id (str):
        thread_id (str):
        body (UpdateThreadMetadata | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ThreadMetadata
    """

    return sync_detailed(
        room_id=room_id,
        thread_id=thread_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateThreadMetadata | Unset = UNSET,
) -> Response[Error | ThreadMetadata]:
    """Edit thread metadata

     This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to
    store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a
    property to `null` to remove it. Corresponds to [`liveblocks.editThreadMetadata`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-metadata).

    Args:
        room_id (str):
        thread_id (str):
        body (UpdateThreadMetadata | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | ThreadMetadata]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    thread_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: UpdateThreadMetadata | Unset = UNSET,
) -> Error | ThreadMetadata | None:
    """Edit thread metadata

     This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to
    store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a
    property to `null` to remove it. Corresponds to [`liveblocks.editThreadMetadata`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-metadata).

    Args:
        room_id (str):
        thread_id (str):
        body (UpdateThreadMetadata | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | ThreadMetadata
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            thread_id=thread_id,
            client=client,
            body=body,
        )
    ).parsed
