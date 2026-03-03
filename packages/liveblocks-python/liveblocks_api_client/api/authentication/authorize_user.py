from typing import Any

import httpx

from ... import errors
from ...models.authorize_user_request_body import AuthorizeUserRequestBody
from ...models.authorize_user_response import AuthorizeUserResponse
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    body: AuthorizeUserRequestBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/authorize-user",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> AuthorizeUserResponse:
    if response.status_code == 200:
        response_200 = AuthorizeUserResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: AuthorizeUserRequestBody | Unset = UNSET,
) -> AuthorizeUserResponse:
    r"""Get access token with secret key

     This endpoint lets your application server (your back end) obtain a token that one of its clients
    (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
    application’s custom authentication endpoint. When making this request, you’ll have to use your
    secret key.

    **Important:** The difference with an [ID token](#post-identify-user) is that an access token holds
    all the permissions, and is the source of truth. With ID tokens, permissions are set in the
    Liveblocks back end (through REST API calls) and \"checked at the door\" every time they are used to
    enter a room.

    **Note:** When using the `@liveblocks/node` package, you can use
    [`Liveblocks.prepareSession`](/docs/api-reference/liveblocks-node#access-tokens) in your back end to
    build this request.

    You can pass the property `userId` in the request’s body. This can be whatever internal identifier
    you use for your user accounts as long as it uniquely identifies an account. The property `userId`
    is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId`
    corresponds to one MAU.

    Additionally, you can set custom metadata to the token, which will be publicly accessible by other
    clients through the `user.info` property. This is useful for storing static data like avatar images
    or the user’s display name.

    Lastly, you’ll specify the exact permissions to give to the user using the `permissions` field. This
    is done in an object where the keys are room names, or room name patterns (ending in a `*`), and a
    list of permissions to assign the user for any room that matches that name exactly (or starts with
    the pattern’s prefix). For tips, see [Manage permissions with access
    tokens](/docs/authentication/access-token).

    Args:
        body (AuthorizeUserRequestBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AuthorizeUserResponse
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
    body: AuthorizeUserRequestBody | Unset = UNSET,
) -> AuthorizeUserResponse:
    r"""Get access token with secret key

     This endpoint lets your application server (your back end) obtain a token that one of its clients
    (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
    application’s custom authentication endpoint. When making this request, you’ll have to use your
    secret key.

    **Important:** The difference with an [ID token](#post-identify-user) is that an access token holds
    all the permissions, and is the source of truth. With ID tokens, permissions are set in the
    Liveblocks back end (through REST API calls) and \"checked at the door\" every time they are used to
    enter a room.

    **Note:** When using the `@liveblocks/node` package, you can use
    [`Liveblocks.prepareSession`](/docs/api-reference/liveblocks-node#access-tokens) in your back end to
    build this request.

    You can pass the property `userId` in the request’s body. This can be whatever internal identifier
    you use for your user accounts as long as it uniquely identifies an account. The property `userId`
    is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId`
    corresponds to one MAU.

    Additionally, you can set custom metadata to the token, which will be publicly accessible by other
    clients through the `user.info` property. This is useful for storing static data like avatar images
    or the user’s display name.

    Lastly, you’ll specify the exact permissions to give to the user using the `permissions` field. This
    is done in an object where the keys are room names, or room name patterns (ending in a `*`), and a
    list of permissions to assign the user for any room that matches that name exactly (or starts with
    the pattern’s prefix). For tips, see [Manage permissions with access
    tokens](/docs/authentication/access-token).

    Args:
        body (AuthorizeUserRequestBody | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AuthorizeUserResponse
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
