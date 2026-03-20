from typing import Any

import httpx

from ... import errors
from ...models.create_group_request_body import CreateGroupRequestBody
from ...models.group import Group


def _get_kwargs(
    *,
    body: CreateGroupRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/groups",
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Group:
    if response.status_code == 200:
        response_200 = Group.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: CreateGroupRequestBody,
) -> Group:
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
    body: CreateGroupRequestBody,
) -> Group:
    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
