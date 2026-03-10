from typing import Any

import httpx

from ... import errors
from ...models.identify_user_request_body import IdentifyUserRequestBody
from ...models.identify_user_response import IdentifyUserResponse


def _get_kwargs(
    *,
    body: IdentifyUserRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/identify-user",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> IdentifyUserResponse:
    if response.status_code == 200:
        response_200 = IdentifyUserResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: IdentifyUserRequestBody,
) -> IdentifyUserResponse:
    r"""Get ID token with secret key

     This endpoint lets your application server (your back end) obtain a token that one of its clients
    (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
    application’s custom authentication endpoint. When using this endpoint to obtain ID tokens, you
    should manage your permissions by assigning user and/or group permissions to rooms explicitly, see
    our [Manage permissions with ID tokens](/docs/authentication/id-token) section.

    **Important:** The difference with an [access token](#post-authorize-user) is that an ID token
    doesn’t hold any permissions itself. With ID tokens, permissions are set in the Liveblocks back end
    (through REST API calls) and \"checked at the door\" every time they are used to enter a room. With
    access tokens, all permissions are set in the token itself, and thus controlled from your back end
    entirely.

    **Note:** When using the `@liveblocks/node` package, you can use
    [`Liveblocks.identifyUser`](/docs/api-reference/liveblocks-node) in your back end to build this
    request.

    You can pass the property `userId` in the request’s body. This can be whatever internal identifier
    you use for your user accounts as long as it uniquely identifies an account. The property `userId`
    is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId`
    corresponds to one MAU.

    If you want to use group permissions, you can also declare which `groupIds` this user belongs to.
    The group ID values are yours, but they will have to match the group IDs you assign permissions to
    when assigning permissions to rooms, see [Manage permissions with ID
    tokens](/docs/authentication/id-token)).

    Additionally, you can set custom metadata to the token, which will be publicly accessible by other
    clients through the `user.info` property. This is useful for storing static data like avatar images
    or the user’s display name.

    Args:
        body (IdentifyUserRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        IdentifyUserResponse
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
    body: IdentifyUserRequestBody,
) -> IdentifyUserResponse:
    r"""Get ID token with secret key

     This endpoint lets your application server (your back end) obtain a token that one of its clients
    (your frontend) can use to enter a Liveblocks room. You use this endpoint to implement your own
    application’s custom authentication endpoint. When using this endpoint to obtain ID tokens, you
    should manage your permissions by assigning user and/or group permissions to rooms explicitly, see
    our [Manage permissions with ID tokens](/docs/authentication/id-token) section.

    **Important:** The difference with an [access token](#post-authorize-user) is that an ID token
    doesn’t hold any permissions itself. With ID tokens, permissions are set in the Liveblocks back end
    (through REST API calls) and \"checked at the door\" every time they are used to enter a room. With
    access tokens, all permissions are set in the token itself, and thus controlled from your back end
    entirely.

    **Note:** When using the `@liveblocks/node` package, you can use
    [`Liveblocks.identifyUser`](/docs/api-reference/liveblocks-node) in your back end to build this
    request.

    You can pass the property `userId` in the request’s body. This can be whatever internal identifier
    you use for your user accounts as long as it uniquely identifies an account. The property `userId`
    is used by Liveblocks to calculate your account’s Monthly Active Users. One unique `userId`
    corresponds to one MAU.

    If you want to use group permissions, you can also declare which `groupIds` this user belongs to.
    The group ID values are yours, but they will have to match the group IDs you assign permissions to
    when assigning permissions to rooms, see [Manage permissions with ID
    tokens](/docs/authentication/id-token)).

    Additionally, you can set custom metadata to the token, which will be publicly accessible by other
    clients through the `user.info` property. This is useful for storing static data like avatar images
    or the user’s display name.

    Args:
        body (IdentifyUserRequestBody):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        IdentifyUserResponse
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
