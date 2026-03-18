from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...types import UNSET, File, Unset


def _get_kwargs(
    room_id: str,
    *,
    body: File,
    guid: str | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    params["guid"] = guid

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/v2/rooms/{room_id}/ydoc".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    _kwargs["content"] = body.payload

    headers["Content-Type"] = "application/octet-stream"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: File,
    guid: str | Unset = UNSET,
) -> None:
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
        guid=guid,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    body: File,
    guid: str | Unset = UNSET,
) -> None:
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
        guid=guid,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
