from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.post_rooms_room_id_storage_body import PostRoomsRoomIdStorageBody
from ...models.post_rooms_room_id_storage_response_200 import PostRoomsRoomIdStorageResponse200
from ...types import UNSET, Response, Unset


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


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | PostRoomsRoomIdStorageResponse200 | None:
    if response.status_code == 200:
        response_200 = PostRoomsRoomIdStorageResponse200.from_dict(response.json())

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

    if response.status_code == 409:
        response_409 = Error.from_dict(response.json())

        return response_409

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Error | PostRoomsRoomIdStorageResponse200]:
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
    body: PostRoomsRoomIdStorageBody | Unset = UNSET,
) -> Response[Error | PostRoomsRoomIdStorageResponse200]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PostRoomsRoomIdStorageResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: PostRoomsRoomIdStorageBody | Unset = UNSET,
) -> Error | PostRoomsRoomIdStorageResponse200 | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PostRoomsRoomIdStorageResponse200
    """

    return sync_detailed(
        room_id=room_id,
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: PostRoomsRoomIdStorageBody | Unset = UNSET,
) -> Response[Error | PostRoomsRoomIdStorageResponse200]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | PostRoomsRoomIdStorageResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    body: PostRoomsRoomIdStorageBody | Unset = UNSET,
) -> Error | PostRoomsRoomIdStorageResponse200 | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | PostRoomsRoomIdStorageResponse200
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            client=client,
            body=body,
        )
    ).parsed
