from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.storage_file_multipart_upload import StorageFileMultipartUpload
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    file_id: str,
    name: str,
    *,
    file_size: int | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["fileSize"] = file_size

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/storage/files/{file_id}/multipart/{name}".format(
            room_id=quote(str(room_id), safe=""),
            file_id=quote(str(file_id), safe=""),
            name=quote(str(name), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> StorageFileMultipartUpload:
    if response.status_code == 200:
        response_200 = StorageFileMultipartUpload.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    file_id: str,
    name: str,
    *,
    client: httpx.Client,
    file_size: int | Unset = UNSET,
) -> StorageFileMultipartUpload:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
        name=name,
        file_size=file_size,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    file_id: str,
    name: str,
    *,
    client: httpx.AsyncClient,
    file_size: int | Unset = UNSET,
) -> StorageFileMultipartUpload:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
        name=name,
        file_size=file_size,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
