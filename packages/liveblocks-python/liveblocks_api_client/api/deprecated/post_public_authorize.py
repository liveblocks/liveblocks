from http import HTTPStatus
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...client import AuthenticatedClient, Client
from ...models.authorization import Authorization
from ...models.error import Error
from ...models.public_authorize_body_request import PublicAuthorizeBodyRequest
from ...types import UNSET, Response, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: PublicAuthorizeBodyRequest | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/public/authorize".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, client: AuthenticatedClient | Client, response: httpx.Response) -> Authorization | Error | None:
    if response.status_code == 200:
        response_200 = Authorization.from_dict(response.json())

        return response_200

    if response.status_code == 403:
        response_403 = Error.from_dict(response.json())

        return response_403

    if response.status_code == 404:
        response_404 = Error.from_dict(response.json())

        return response_404

    if response.status_code == 422:
        response_422 = Error.from_dict(response.json())

        return response_422

    if client.raise_on_unexpected_status:
        raise errors.UnexpectedStatus(response.status_code, response.content)
    else:
        return None


def _build_response(
    *, client: AuthenticatedClient | Client, response: httpx.Response
) -> Response[Authorization | Error]:
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
    body: PublicAuthorizeBodyRequest | Unset = UNSET,
) -> Response[Authorization | Error]:
    r"""Get single-room token with public key

     **Deprecated.** When you update Liveblocks to 1.2, you no longer need to get a JWT token when using
    a public key.

    This endpoint works with the public key and can be used client side. That means you don’t need to
    implement a dedicated authorization endpoint server side.
    The generated JWT token works only with public room (`defaultAccesses: [\"room:write\"]`).

    Args:
        room_id (str):
        body (PublicAuthorizeBodyRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Authorization | Error]
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
    body: PublicAuthorizeBodyRequest | Unset = UNSET,
) -> Authorization | Error | None:
    r"""Get single-room token with public key

     **Deprecated.** When you update Liveblocks to 1.2, you no longer need to get a JWT token when using
    a public key.

    This endpoint works with the public key and can be used client side. That means you don’t need to
    implement a dedicated authorization endpoint server side.
    The generated JWT token works only with public room (`defaultAccesses: [\"room:write\"]`).

    Args:
        room_id (str):
        body (PublicAuthorizeBodyRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Authorization | Error
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
    body: PublicAuthorizeBodyRequest | Unset = UNSET,
) -> Response[Authorization | Error]:
    r"""Get single-room token with public key

     **Deprecated.** When you update Liveblocks to 1.2, you no longer need to get a JWT token when using
    a public key.

    This endpoint works with the public key and can be used client side. That means you don’t need to
    implement a dedicated authorization endpoint server side.
    The generated JWT token works only with public room (`defaultAccesses: [\"room:write\"]`).

    Args:
        room_id (str):
        body (PublicAuthorizeBodyRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Response[Authorization | Error]
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
    body: PublicAuthorizeBodyRequest | Unset = UNSET,
) -> Authorization | Error | None:
    r"""Get single-room token with public key

     **Deprecated.** When you update Liveblocks to 1.2, you no longer need to get a JWT token when using
    a public key.

    This endpoint works with the public key and can be used client side. That means you don’t need to
    implement a dedicated authorization endpoint server side.
    The generated JWT token works only with public room (`defaultAccesses: [\"room:write\"]`).

    Args:
        room_id (str):
        body (PublicAuthorizeBodyRequest | Unset):

    Raises:
        errors.UnexpectedStatus: If the server returns an undocumented status code and Client.raise_on_unexpected_status is True.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Authorization | Error
    """

    return (
        await asyncio_detailed(
            room_id=room_id,
            client=client,
            body=body,
        )
    ).parsed
