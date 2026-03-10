from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.thread_metadata import ThreadMetadata
from ...models.update_thread_metadata_request_body import UpdateThreadMetadataRequestBody


def _get_kwargs(
    room_id: str,
    thread_id: str,
    *,
    body: UpdateThreadMetadataRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/threads/{thread_id}/metadata".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> ThreadMetadata:
    if response.status_code == 200:
        response_200 = ThreadMetadata.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.Client,
    body: UpdateThreadMetadataRequestBody,
) -> ThreadMetadata:
    """Edit thread metadata

     This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to
    store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a
    property to `null` to remove it. Corresponds to [`liveblocks.editThreadMetadata`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-metadata).

    Args:
        room_id (str):
        thread_id (str):
        body (UpdateThreadMetadataRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ThreadMetadata
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
    body: UpdateThreadMetadataRequestBody,
) -> ThreadMetadata:
    """Edit thread metadata

     This endpoint edits the metadata of a thread. The metadata is a JSON object that can be used to
    store any information you want about the thread, in `string`, `number`, or `boolean` form. Set a
    property to `null` to remove it. Corresponds to [`liveblocks.editThreadMetadata`](/docs/api-
    reference/liveblocks-node#post-rooms-roomId-threads-threadId-metadata).

    Args:
        room_id (str):
        thread_id (str):
        body (UpdateThreadMetadataRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        ThreadMetadata
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
