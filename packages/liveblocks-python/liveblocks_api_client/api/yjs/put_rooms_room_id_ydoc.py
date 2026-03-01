from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...types import UNSET, File, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: File | Unset = UNSET,
    guid: str | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    params["guid"] = guid

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/rooms/{room_id}/ydoc".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    if not isinstance(body, Unset):
        _kwargs["content"] = body.payload

    headers["Content-Type"] = "application/octet-stream"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: File | Unset = UNSET,
    guid: str | Unset = UNSET,
) -> Any:
    """Send a binary Yjs update

     This endpoint is used to send a Yjs binary update to the room’s Yjs document. You can use this
    endpoint to initialize Yjs data for the room or to update the room’s Yjs document. To send an update
    to a subdocument instead of the main document, pass its `guid`. Corresponds to
    [`liveblocks.sendYjsBinaryUpdate`](/docs/api-reference/liveblocks-node#put-rooms-roomId-ydoc).

    The update is typically obtained by calling `Y.encodeStateAsUpdate(doc)`. See the [Yjs
    documentation](https://docs.yjs.dev/api/document-updates) for more details. When manually making
    this HTTP call, set the HTTP header `Content-Type` to `application/octet-stream`, and send the
    binary update (a `Uint8Array`) in the body of the HTTP request. This endpoint does not accept JSON,
    unlike most other endpoints.

    Args:
        room_id (str):
        guid (str | Unset):
        body (File | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
        guid=guid,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    body: File | Unset = UNSET,
    guid: str | Unset = UNSET,
) -> Any:
    """Send a binary Yjs update

     This endpoint is used to send a Yjs binary update to the room’s Yjs document. You can use this
    endpoint to initialize Yjs data for the room or to update the room’s Yjs document. To send an update
    to a subdocument instead of the main document, pass its `guid`. Corresponds to
    [`liveblocks.sendYjsBinaryUpdate`](/docs/api-reference/liveblocks-node#put-rooms-roomId-ydoc).

    The update is typically obtained by calling `Y.encodeStateAsUpdate(doc)`. See the [Yjs
    documentation](https://docs.yjs.dev/api/document-updates) for more details. When manually making
    this HTTP call, set the HTTP header `Content-Type` to `application/octet-stream`, and send the
    binary update (a `Uint8Array`) in the body of the HTTP request. This endpoint does not accept JSON,
    unlike most other endpoints.

    Args:
        room_id (str):
        guid (str | Unset):
        body (File | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
        guid=guid,
    )

    response = await client.request(
        **kwargs,
    )

    return None
