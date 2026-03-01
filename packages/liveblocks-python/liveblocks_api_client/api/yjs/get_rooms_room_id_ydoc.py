from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_rooms_room_id_ydoc_response_200 import GetRoomsRoomIdYdocResponse200
from ...models.get_rooms_room_id_ydoc_type import GetRoomsRoomIdYdocType
from ...types import UNSET, Unset


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


def _parse_response(*, response: httpx.Response) -> GetRoomsRoomIdYdocResponse200:
    if response.status_code == 200:
        response_200 = GetRoomsRoomIdYdocResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetRoomsRoomIdYdocType | Unset = UNSET,
) -> GetRoomsRoomIdYdocResponse200:
    """Get Yjs document

     This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to
    [`liveblocks.getYjsDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc).

    Args:
        room_id (str):
        formatting (bool | Unset):
        key (str | Unset):
        type_ (GetRoomsRoomIdYdocType | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetRoomsRoomIdYdocResponse200
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        formatting=formatting,
        key=key,
        type_=type_,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetRoomsRoomIdYdocType | Unset = UNSET,
) -> GetRoomsRoomIdYdocResponse200:
    """Get Yjs document

     This endpoint returns a JSON representation of the room’s Yjs document. Corresponds to
    [`liveblocks.getYjsDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-ydoc).

    Args:
        room_id (str):
        formatting (bool | Unset):
        key (str | Unset):
        type_ (GetRoomsRoomIdYdocType | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        GetRoomsRoomIdYdocResponse200
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        formatting=formatting,
        key=key,
        type_=type_,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
