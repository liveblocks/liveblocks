from typing import Any

import httpx

from ... import errors
from ...models.create_room import CreateRoom
from ...models.room import Room
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    body: CreateRoom | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Room:
    if response.status_code == 200:
        response_200 = Room.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: CreateRoom | Unset = UNSET,
) -> Room:
    r"""Create room

     This endpoint creates a new room. `id` and `defaultAccesses` are required. When provided with a
    `?idempotent` query argument, will not return a 409 when the room already exists, but instead return
    the existing room as-is. Corresponds to [`liveblocks.createRoom`](/docs/api-reference/liveblocks-
    node#post-rooms), or to [`liveblocks.getOrCreateRoom`](docs/api-reference/liveblocks-node#get-or-
    create-rooms-roomId) when `?idempotent` is provided.
    - `defaultAccessess` could be `[]` or `[\"room:write\"]` (private or public).
    - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
    Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
    `metadata` is optional field.
    - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
    100 ids maximum. Id length has a limit of 40 characters. `usersAccesses` is optional field.
    - `groupsAccesses` are optional fields.

    Args:
        body (CreateRoom | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Room
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    body: CreateRoom | Unset = UNSET,
) -> Room:
    r"""Create room

     This endpoint creates a new room. `id` and `defaultAccesses` are required. When provided with a
    `?idempotent` query argument, will not return a 409 when the room already exists, but instead return
    the existing room as-is. Corresponds to [`liveblocks.createRoom`](/docs/api-reference/liveblocks-
    node#post-rooms), or to [`liveblocks.getOrCreateRoom`](docs/api-reference/liveblocks-node#get-or-
    create-rooms-roomId) when `?idempotent` is provided.
    - `defaultAccessess` could be `[]` or `[\"room:write\"]` (private or public).
    - `metadata` could be key/value as `string` or `string[]`. `metadata` supports maximum 50 entries.
    Key length has a limit of 40 characters maximum. Value length has a limit of 256 characters maximum.
    `metadata` is optional field.
    - `usersAccesses` could be `[]` or `[\"room:write\"]` for every records. `usersAccesses` can contain
    100 ids maximum. Id length has a limit of 40 characters. `usersAccesses` is optional field.
    - `groupsAccesses` are optional fields.

    Args:
        body (CreateRoom | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Room
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
