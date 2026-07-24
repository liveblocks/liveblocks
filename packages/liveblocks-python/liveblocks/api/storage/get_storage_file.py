from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.storage_file_with_url import StorageFileWithUrl


def _get_kwargs(
    room_id: str,
    file_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/storage/files/{file_id}".format(
            room_id=quote(str(room_id), safe=""),
            file_id=quote(str(file_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> StorageFileWithUrl:
    if response.status_code == 200:
        response_200 = StorageFileWithUrl.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    file_id: str,
    *,
    client: httpx.Client,
) -> StorageFileWithUrl:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    file_id: str,
    *,
    client: httpx.AsyncClient,
) -> StorageFileWithUrl:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
