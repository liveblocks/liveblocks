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
    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
