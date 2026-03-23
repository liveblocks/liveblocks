from typing import Any

import httpx

from ... import errors
from ...models.authorize_user_request_body import AuthorizeUserRequestBody
from ...models.authorize_user_response import AuthorizeUserResponse


def _get_kwargs(
    *,
    body: AuthorizeUserRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/authorize-user",
    }

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
    body: AuthorizeUserRequestBody,
) -> AuthorizeUserResponse:
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
    body: AuthorizeUserRequestBody,
) -> AuthorizeUserResponse:
    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
