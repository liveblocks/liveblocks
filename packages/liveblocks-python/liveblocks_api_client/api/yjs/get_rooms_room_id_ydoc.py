from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_rooms_room_id_ydoc_response_200 import GetRoomsRoomIdYdocResponse200
from ...models.get_rooms_room_id_ydoc_type import GetRoomsRoomIdYdocType
from ...types import UNSET, Response, Unset


def _get_kwargs(
    room_id: str,
    *,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetRoomsRoomIdYdocType | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["formatting"] = formatting

    params["key"] = key

    json_type_: str | Unset = UNSET
    if not isinstance(type_, Unset):
        json_type_ = type_.value

    params["type"] = json_type_

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/ydoc".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetRoomsRoomIdYdocResponse200 | None:
    if response.status_code == 200:
        response_200 = GetRoomsRoomIdYdocResponse200.from_dict(response.json())

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


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | GetRoomsRoomIdYdocResponse200]:
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
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetRoomsRoomIdYdocType | Unset = UNSET,
) -> Response[Error | GetRoomsRoomIdYdocResponse200]:
    """Get Yjs document

     This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to
    [`liveblocks.getYjsDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc).

    Args:
        room_id (str):
        formatting (bool | Unset):
        key (str | Unset):
        type_ (GetRoomsRoomIdYdocType | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetRoomsRoomIdYdocResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        formatting=formatting,
        key=key,
        type_=type_,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetRoomsRoomIdYdocType | Unset = UNSET,
) -> Error | GetRoomsRoomIdYdocResponse200 | None:
    """Get Yjs document

     This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to
    [`liveblocks.getYjsDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc).

    Args:
        room_id (str):
        formatting (bool | Unset):
        key (str | Unset):
        type_ (GetRoomsRoomIdYdocType | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetRoomsRoomIdYdocResponse200
    """

    return sync_detailed(
        room_id=room_id,
        client=client,
        formatting=formatting,
        key=key,
        type_=type_,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetRoomsRoomIdYdocType | Unset = UNSET,
) -> Response[Error | GetRoomsRoomIdYdocResponse200]:
    """Get Yjs document

     This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to
    [`liveblocks.getYjsDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc).

    Args:
        room_id (str):
        formatting (bool | Unset):
        key (str | Unset):
        type_ (GetRoomsRoomIdYdocType | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetRoomsRoomIdYdocResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        formatting=formatting,
        key=key,
        type_=type_,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetRoomsRoomIdYdocType | Unset = UNSET,
) -> Error | GetRoomsRoomIdYdocResponse200 | None:
    """Get Yjs document

     This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to
    [`liveblocks.getYjsDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc).

    Args:
        room_id (str):
        formatting (bool | Unset):
        key (str | Unset):
        type_ (GetRoomsRoomIdYdocType | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetRoomsRoomIdYdocResponse200
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            client=client,
            formatting=formatting,
            key=key,
            type_=type_,
        )
    ).parsed
