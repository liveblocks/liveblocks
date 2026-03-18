from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_yjs_version_response import CreateYjsVersionResponse


def _get_kwargs(
    room_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/version".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> CreateYjsVersionResponse:
    if response.status_code == 200:
        response_200 = CreateYjsVersionResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
) -> CreateYjsVersionResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
) -> CreateYjsVersionResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
