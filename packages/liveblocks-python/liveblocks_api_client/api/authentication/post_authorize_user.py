from http import HTTPStatus
from typing import Any

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.an_http_response_body_containing_a_token import AnHTTPResponseBodyContainingAToken
from ...models.authorize_user_request import AuthorizeUserRequest
from ...models.error import Error
from ...types import UNSET, Response, Unset


def _get_kwargs(
    *,
    body: AuthorizeUserRequest | Unset = UNSET,
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


def _parse_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> AnHTTPResponseBodyContainingAToken | Error | None:
    if response.status_code == 200:
        response_200 = AnHTTPResponseBodyContainingAToken.from_dict(response.json())

        return response_200

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[AnHTTPResponseBodyContainingAToken | Error]:
    return Response(
        status_code=HTTPStatus(response.status_code),
        content=response.content,
        headers=response.headers,
        parsed=_parse_response(client=client, response=response),
    )


def sync_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: AuthorizeUserRequest | Unset = UNSET,
) -> Response[AnHTTPResponseBodyContainingAToken | Error]:
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
        body (AuthorizeUserRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AnHTTPResponseBodyContainingAToken | Error]
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
    body: AuthorizeUserRequest | Unset = UNSET,
) -> AnHTTPResponseBodyContainingAToken | Error | None:
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
        body (AuthorizeUserRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AnHTTPResponseBodyContainingAToken | Error
    """

    return sync_detailed(
        client=client,
        body=body,
    ).parsed


async def asyncio_detailed(
    *,
    client: AuthenticatedClient | Client,
    body: AuthorizeUserRequest | Unset = UNSET,
) -> Response[AnHTTPResponseBodyContainingAToken | Error]:
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
        body (AuthorizeUserRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[AnHTTPResponseBodyContainingAToken | Error]
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.get_async_httpx_client().request(**kwargs)

    return _build_response(client=client, response=response)


async def asyncio(
    *,
    client: AuthenticatedClient | Client,
    body: AuthorizeUserRequest | Unset = UNSET,
) -> AnHTTPResponseBodyContainingAToken | Error | None:
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
        body (AuthorizeUserRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        AnHTTPResponseBodyContainingAToken | Error
    """

    return (
        await asyncio_detailed(
            client=client,
            body=body,
        )
    ).parsed
