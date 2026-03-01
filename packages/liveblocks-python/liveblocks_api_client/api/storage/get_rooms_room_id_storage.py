from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.error import Error
from ...models.get_rooms_room_id_storage_format import GetRoomsRoomIdStorageFormat
from ...models.get_rooms_room_id_storage_response_200 import GetRoomsRoomIdStorageResponse200
from ...types import UNSET, Response, Unset


def _get_kwargs(
    room_id: str,
    *,
    format_: GetRoomsRoomIdStorageFormat | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    json_format_: str | Unset = UNSET
    if not isinstance(format_, Unset):
        json_format_ = format_.value

    params["format"] = json_format_

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/storage".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Error | GetRoomsRoomIdStorageResponse200 | None:
    if response.status_code == 200:
        response_200 = GetRoomsRoomIdStorageResponse200.from_dict(response.json())

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
) -> Response[Error | GetRoomsRoomIdStorageResponse200]:
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
    format_: GetRoomsRoomIdStorageFormat | Unset = UNSET,
) -> Response[Error | GetRoomsRoomIdStorageResponse200]:
    r"""Get Storage document

     Returns the contents of the room’s Storage tree.  Corresponds to
    [`liveblocks.getStorageDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-storage).

    The default outputted format is called “plain LSON”, which includes information on the Live data
    structures in the tree. These nodes show up in the output as objects with two properties, for
    example:

    ```json
    {
      \"liveblocksType\": \"LiveObject\",
      \"data\": ...
    }
    ```

    If you’re not interested in this information, you can use the simpler `?format=json` query param,
    see below.

    Args:
        room_id (str):
        format_ (GetRoomsRoomIdStorageFormat | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetRoomsRoomIdStorageResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        format_=format_,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    format_: GetRoomsRoomIdStorageFormat | Unset = UNSET,
) -> Error | GetRoomsRoomIdStorageResponse200 | None:
    r"""Get Storage document

     Returns the contents of the room’s Storage tree.  Corresponds to
    [`liveblocks.getStorageDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-storage).

    The default outputted format is called “plain LSON”, which includes information on the Live data
    structures in the tree. These nodes show up in the output as objects with two properties, for
    example:

    ```json
    {
      \"liveblocksType\": \"LiveObject\",
      \"data\": ...
    }
    ```

    If you’re not interested in this information, you can use the simpler `?format=json` query param,
    see below.

    Args:
        room_id (str):
        format_ (GetRoomsRoomIdStorageFormat | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetRoomsRoomIdStorageResponse200
    """

    return sync_detailed(
        room_id=room_id,
        client=client,
        format_=format_,
    ).parsed


async def asyncio_detailed(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    format_: GetRoomsRoomIdStorageFormat | Unset = UNSET,
) -> Response[Error | GetRoomsRoomIdStorageResponse200]:
    r"""Get Storage document

     Returns the contents of the room’s Storage tree.  Corresponds to
    [`liveblocks.getStorageDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-storage).

    The default outputted format is called “plain LSON”, which includes information on the Live data
    structures in the tree. These nodes show up in the output as objects with two properties, for
    example:

    ```json
    {
      \"liveblocksType\": \"LiveObject\",
      \"data\": ...
    }
    ```

    If you’re not interested in this information, you can use the simpler `?format=json` query param,
    see below.

    Args:
        room_id (str):
        format_ (GetRoomsRoomIdStorageFormat | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | GetRoomsRoomIdStorageResponse200]
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        format_=format_,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    room_id: str,
    *,
    client: AuthenticatedClient | Client,
    format_: GetRoomsRoomIdStorageFormat | Unset = UNSET,
) -> Error | GetRoomsRoomIdStorageResponse200 | None:
    r"""Get Storage document

     Returns the contents of the room’s Storage tree.  Corresponds to
    [`liveblocks.getStorageDocument`](/docs/api-reference/liveblocks-node#get-rooms-roomId-storage).

    The default outputted format is called “plain LSON”, which includes information on the Live data
    structures in the tree. These nodes show up in the output as objects with two properties, for
    example:

    ```json
    {
      \"liveblocksType\": \"LiveObject\",
      \"data\": ...
    }
    ```

    If you’re not interested in this information, you can use the simpler `?format=json` query param,
    see below.

    Args:
        room_id (str):
        format_ (GetRoomsRoomIdStorageFormat | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | GetRoomsRoomIdStorageResponse200
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            client=client,
            format_=format_,
        )
    ).parsed
