from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.create_room import CreateRoom
from ...models.error import Error
from ...models.room import Room
from ...types import UNSET, Response, Unset


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


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Error | Room | None:
    if response.status_code == 200:
        response_200 = Room.from_dict(response.json())

        return response_200

    if response.status_code == 401:
        response_401 = Error.from_dict(response.json())

        return response_401

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 409:
        response_409 = Error.from_dict(response.json())

        return response_409

    if response.status_code == 422:
        response_422 = Error.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Response[Error | Room]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: CreateRoom | Unset = UNSET,
) -> Response[Error | Room]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | Room]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.get_httpx_client().request(
        **kwargs,
    )

    return _build_response(client=client, response=response)


def sync(
    *,
    client: AuthenticatedClient | Client,
    body: CreateRoom | Unset = UNSET,
) -> Error | Room | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | Room
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: CreateRoom | Unset = UNSET,
) -> Response[Error | Room]:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Error | Room]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: CreateRoom | Unset = UNSET,
) -> Error | Room | None:
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
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Error | Room
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
