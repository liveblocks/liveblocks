from typing import Any

import httpx

from ... import errors
from ...models.create_room_request_body import CreateRoomRequestBody
from ...models.room import Room
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    body: CreateRoomRequestBody,
    idempotent: bool | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    params["idempotent"] = idempotent

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms",
        "params": params,
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Room:
    if response.status_code == 200:
        response_200 = Room.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: CreateRoomRequestBody,
    idempotent: bool | Unset = UNSET,
) -> Room:
    kwargs = _get_kwargs(
        body=body,
        idempotent=idempotent,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    body: CreateRoomRequestBody,
    idempotent: bool | Unset = UNSET,
) -> Room:
    kwargs = _get_kwargs(
        body=body,
        idempotent=idempotent,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
