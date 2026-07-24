from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    room_id: str,
    file_id: str,
    upload_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/v2/rooms/{room_id}/storage/files/{file_id}/multipart/{upload_id}".format(
            room_id=quote(str(room_id), safe=""),
            file_id=quote(str(file_id), safe=""),
            upload_id=quote(str(upload_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    file_id: str,
    upload_id: str,
    *,
    client: httpx.Client,
) -> None:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
        upload_id=upload_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    file_id: str,
    upload_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
        upload_id=upload_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
