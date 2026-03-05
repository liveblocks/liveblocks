from io import BytesIO
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...types import UNSET, File, Unset


def _get_kwargs(
    room_id: str,
    *,
    guid: str | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["guid"] = guid

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/ydoc-binary".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> File:
    if response.status_code == 200:
        response_200 = File(payload=BytesIO(response.content))

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    guid: str | Unset = UNSET,
) -> File:
    """Get Yjs document encoded as a binary Yjs update

     This endpoint returns the room's Yjs document encoded as a single binary update. This can be used by
    `Y.applyUpdate(responseBody)` to get a copy of the document in your back end. See [Yjs
    documentation](https://docs.yjs.dev/api/document-updates) for more information on working with
    updates. To return a subdocument instead of the main document, pass its `guid`. Corresponds to
    [`liveblocks.getYjsDocumentAsBinaryUpdate`](/docs/api-reference/liveblocks-node#get-rooms-roomId-
    ydoc-binary).

    Args:
        room_id (str):
        guid (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        File
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        guid=guid,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    guid: str | Unset = UNSET,
) -> File:
    """Get Yjs document encoded as a binary Yjs update

     This endpoint returns the room's Yjs document encoded as a single binary update. This can be used by
    `Y.applyUpdate(responseBody)` to get a copy of the document in your back end. See [Yjs
    documentation](https://docs.yjs.dev/api/document-updates) for more information on working with
    updates. To return a subdocument instead of the main document, pass its `guid`. Corresponds to
    [`liveblocks.getYjsDocumentAsBinaryUpdate`](/docs/api-reference/liveblocks-node#get-rooms-roomId-
    ydoc-binary).

    Args:
        room_id (str):
        guid (str | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        File
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        guid=guid,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
