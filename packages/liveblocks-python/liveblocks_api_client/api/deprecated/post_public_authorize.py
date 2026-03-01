from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.authorization import Authorization
from ...models.public_authorize_body_request import PublicAuthorizeBodyRequest
from ...types import UNSET, Unset


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


def _parse_response(*, response: httpx.Response) -> Authorization:
    if response.status_code == 200:
        response_200 = Authorization.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: PublicAuthorizeBodyRequest | Unset = UNSET,
) -> Authorization:
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
    body: PublicAuthorizeBodyRequest | Unset = UNSET,
) -> Authorization:
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
