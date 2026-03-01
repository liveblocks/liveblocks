from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...types import UNSET, File, Response, Unset


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


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Any | Error | None:
    if response.status_code == 200:
        response_200 = response.json()
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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Any | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: File | Unset = UNSET,
    guid: str | Unset = UNSET,
) -> Response[Any | Error]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
        guid=guid,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: File | Unset = UNSET,
    guid: str | Unset = UNSET,
) -> Any | Error | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error
    """

    return sync_detailed(
        room_id=room_id,
        client=client,
        body=body,
        guid=guid,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: File | Unset = UNSET,
    guid: str | Unset = UNSET,
) -> Response[Any | Error]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Any | Error]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
        guid=guid,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: File | Unset = UNSET,
    guid: str | Unset = UNSET,
) -> Any | Error | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any | Error
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            client=client,
            body=body,
            guid=guid,
        )
    ).parsed
