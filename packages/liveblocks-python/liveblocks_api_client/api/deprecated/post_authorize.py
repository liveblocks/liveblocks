from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.authorization import Authorization
from ...models.create_authorization import CreateAuthorization
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: CreateAuthorization | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/authorize".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Authorization:
    if response.status_code == 200:
        response_200 = Authorization.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: CreateAuthorization | Unset = UNSET,
) -> Authorization:
    """Get single-room token with secret key

     **Deprecated.** Prefer using [access tokens](#post-authorize-user) or [ID tokens](#post-identify-
    user) instead. Read more in our [migration guide](/docs/platform/upgrading/1.2).

    This endpoint lets your application server (your back end) obtain a token that one of its clients
    (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
    application’s custom authentication endpoint. When making this request, you’ll have to use your
    secret key.

    You can pass the property `userId` in the request’s body. This can be whatever internal identifier
    you use for your user accounts as long as it uniquely identifies an account. Setting the `userId` is
    optional if you want to use public rooms, but it is required to enter a private room (because
    permissions are assigned to specific user IDs). In case you want to use the group permission system,
    you can also declare which `groupIds` this user belongs to.

    The property userId is used by Liveblocks to calculate your account’s Monthly Active Users. One
    unique userId corresponds to one MAU. If you don’t pass a userId, we will create for you a new
    anonymous userId on each connection, but your MAUs will be higher.

    Additionally, you can set custom metadata to the token, which will be publicly accessible by other
    clients through the `user.info` property. This is useful for storing static data like avatar images
    or the user’s display name.

    Args:
        room_id (str):
        body (CreateAuthorization | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Authorization
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
    body: CreateAuthorization | Unset = UNSET,
) -> Authorization:
    """Get single-room token with secret key

     **Deprecated.** Prefer using [access tokens](#post-authorize-user) or [ID tokens](#post-identify-
    user) instead. Read more in our [migration guide](/docs/platform/upgrading/1.2).

    This endpoint lets your application server (your back end) obtain a token that one of its clients
    (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
    application’s custom authentication endpoint. When making this request, you’ll have to use your
    secret key.

    You can pass the property `userId` in the request’s body. This can be whatever internal identifier
    you use for your user accounts as long as it uniquely identifies an account. Setting the `userId` is
    optional if you want to use public rooms, but it is required to enter a private room (because
    permissions are assigned to specific user IDs). In case you want to use the group permission system,
    you can also declare which `groupIds` this user belongs to.

    The property userId is used by Liveblocks to calculate your account’s Monthly Active Users. One
    unique userId corresponds to one MAU. If you don’t pass a userId, we will create for you a new
    anonymous userId on each connection, but your MAUs will be higher.

    Additionally, you can set custom metadata to the token, which will be publicly accessible by other
    clients through the `user.info` property. This is useful for storing static data like avatar images
    or the user’s display name.

    Args:
        room_id (str):
        body (CreateAuthorization | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Authorization
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
