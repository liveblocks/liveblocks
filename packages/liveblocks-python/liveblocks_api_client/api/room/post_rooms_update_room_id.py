from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.post_rooms_update_room_id_files_body import PostRoomsUpdateRoomIdFilesBody
from ...models.room import Room
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: PostRoomsUpdateRoomIdFilesBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/update-room-id".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["files"] = body.to_multipart()

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
    body: PostRoomsUpdateRoomIdFilesBody | Unset = UNSET,
) -> Room:
    """Update room ID

     This endpoint permanently updates the room’s ID.

    Args:
        room_id (str):
        body (PostRoomsUpdateRoomIdFilesBody | Unset):

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
    body: PostRoomsUpdateRoomIdFilesBody | Unset = UNSET,
) -> Room:
    """Update room ID

     This endpoint permanently updates the room’s ID.

    Args:
        room_id (str):
        body (PostRoomsUpdateRoomIdFilesBody | Unset):

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
