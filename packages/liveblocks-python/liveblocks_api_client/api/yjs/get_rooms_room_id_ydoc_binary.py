from http import HTTPStatus
from io import BytesIO
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


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | File | None:
    if response.status_code == 200:
        response_200 = File(payload=BytesIO(response.content))

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


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | File]:
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
    guid: str | Unset = UNSET,
) -> Response[Error | File]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | File]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
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
    guid: str | Unset = UNSET,
) -> Error | File | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | File
    """

    return sync_detailed(
        room_id=room_id,
        client=client,
        guid=guid,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    guid: str | Unset = UNSET,
) -> Response[Error | File]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | File]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        guid=guid,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    guid: str | Unset = UNSET,
) -> Error | File | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | File
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            client=client,
            guid=guid,
        )
    ).parsed
