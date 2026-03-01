from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.room import Room
from ...models.upsert_room import UpsertRoom
from ...models.upsert_rooms_room_id_files_body import UpsertRoomsRoomIdFilesBody
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: UpsertRoom | UpsertRoomsRoomIdFilesBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/upsert".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    if isinstance(body, UpsertRoom):
        if not isinstance(body, Unset):
            _kwargs["json"] = body.to_dict()

        headers["Content-Type"] = "application/json"
    if isinstance(body, UpsertRoomsRoomIdFilesBody):
        if not isinstance(body, Unset):
            _kwargs["files"] = body.to_multipart()

        headers["Content-Type"] = "multipart/form-data"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Room:
    if response.status_code == 200:
        response_200 = Room.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: UpsertRoom | UpsertRoomsRoomIdFilesBody | Unset = UNSET,
) -> Room:
    r"""Upsert (update or create) room

     This endpoint updates specific properties of a room. Corresponds to
    [`liveblocks.upsertRoom`](/docs/api-reference/liveblocks-node#upsert-rooms-roomId).

    It’s not necessary to provide the entire room’s information.
    Setting a property to `null` means to delete this property. For example, if you want to remove
    access to a specific user without losing other users:
    ``{
        \"usersAccesses\": {
            \"john\": null
        }
    }``
    `defaultAccessess`, `metadata`, `usersAccesses`, `groupsAccesses` can be updated.

    - `defaultAccessess` could be `[]` or `[\"room:write\"]` (private or public).
    - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
    Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
    `metadata` is optional field.
    - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
    100 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
    - `groupsAccesses` could be `[]` or `[\"room:write\"]` for every records. `groupsAccesses` can
    contain 100 ids maximum. Id length has a limit of 256 characters. `groupsAccesses` is optional
    field.

    Args:
        room_id (str):
        body (UpsertRoom | Unset):
        body (UpsertRoomsRoomIdFilesBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Room
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
    body: UpsertRoom | UpsertRoomsRoomIdFilesBody | Unset = UNSET,
) -> Room:
    r"""Upsert (update or create) room

     This endpoint updates specific properties of a room. Corresponds to
    [`liveblocks.upsertRoom`](/docs/api-reference/liveblocks-node#upsert-rooms-roomId).

    It’s not necessary to provide the entire room’s information.
    Setting a property to `null` means to delete this property. For example, if you want to remove
    access to a specific user without losing other users:
    ``{
        \"usersAccesses\": {
            \"john\": null
        }
    }``
    `defaultAccessess`, `metadata`, `usersAccesses`, `groupsAccesses` can be updated.

    - `defaultAccessess` could be `[]` or `[\"room:write\"]` (private or public).
    - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
    Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
    `metadata` is optional field.
    - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
    100 ids maximum. Id length has a limit of 256 characters. `usersAccesses` is optional field.
    - `groupsAccesses` could be `[]` or `[\"room:write\"]` for every records. `groupsAccesses` can
    contain 100 ids maximum. Id length has a limit of 256 characters. `groupsAccesses` is optional
    field.

    Args:
        room_id (str):
        body (UpsertRoom | Unset):
        body (UpsertRoomsRoomIdFilesBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Room
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
