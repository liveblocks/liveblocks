from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.post_rooms_room_id_storage_body import PostRoomsRoomIdStorageBody
from ...models.post_rooms_room_id_storage_response_200 import PostRoomsRoomIdStorageResponse200
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: PostRoomsRoomIdStorageBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/storage".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> PostRoomsRoomIdStorageResponse200:
    if response.status_code == 200:
        response_200 = PostRoomsRoomIdStorageResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: PostRoomsRoomIdStorageBody | Unset = UNSET,
) -> PostRoomsRoomIdStorageResponse200:
    r"""Initialize Storage document

     This endpoint initializes or reinitializes a room’s Storage. The room must already exist. Calling
    this endpoint will disconnect all users from the room if there are any, triggering a reconnect.
    Corresponds to [`liveblocks.initializeStorageDocument`](/docs/api-reference/liveblocks-node#post-
    rooms-roomId-storage).

    The format of the request body is the same as what’s returned by the get Storage endpoint.

    For each Liveblocks data structure that you want to create, you need a JSON element having two
    properties:
    - `\"liveblocksType\"` => `\"LiveObject\" | \"LiveList\" | \"LiveMap\"`
    - `\"data\"` => contains the nested data structures (children) and data.

    The root’s type can only be LiveObject.

    A utility function, `toPlainLson` is included in `@liveblocks/client` from `1.0.9` to help convert
    `LiveObject`, `LiveList`, and `LiveMap` to the structure expected by the endpoint.

    Args:
        room_id (str):
        body (PostRoomsRoomIdStorageBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostRoomsRoomIdStorageResponse200
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    body: PostRoomsRoomIdStorageBody | Unset = UNSET,
) -> PostRoomsRoomIdStorageResponse200:
    r"""Initialize Storage document

     This endpoint initializes or reinitializes a room’s Storage. The room must already exist. Calling
    this endpoint will disconnect all users from the room if there are any, triggering a reconnect.
    Corresponds to [`liveblocks.initializeStorageDocument`](/docs/api-reference/liveblocks-node#post-
    rooms-roomId-storage).

    The format of the request body is the same as what’s returned by the get Storage endpoint.

    For each Liveblocks data structure that you want to create, you need a JSON element having two
    properties:
    - `\"liveblocksType\"` => `\"LiveObject\" | \"LiveList\" | \"LiveMap\"`
    - `\"data\"` => contains the nested data structures (children) and data.

    The root’s type can only be LiveObject.

    A utility function, `toPlainLson` is included in `@liveblocks/client` from `1.0.9` to help convert
    `LiveObject`, `LiveList`, and `LiveMap` to the structure expected by the endpoint.

    Args:
        room_id (str):
        body (PostRoomsRoomIdStorageBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        PostRoomsRoomIdStorageResponse200
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
