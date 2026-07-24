from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.storage_file_multipart_part import StorageFileMultipartPart
from ...types import File


def _get_kwargs(
    room_id: str,
    file_id: str,
    upload_id: str,
    part_number: int,
    *,
    body: File,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/v2/rooms/{room_id}/storage/files/{file_id}/multipart/{upload_id}/{part_number}".format(
            room_id=quote(str(room_id), safe=""),
            file_id=quote(str(file_id), safe=""),
            upload_id=quote(str(upload_id), safe=""),
            part_number=quote(str(part_number), safe=""),
        ),
    }

    _kwargs["content"] = body.payload

    headers["Content-Type"] = "application/octet-stream"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> StorageFileMultipartPart:
    if response.status_code == 200:
        response_200 = StorageFileMultipartPart.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    file_id: str,
    upload_id: str,
    part_number: int,
    *,
    client: httpx.Client,
    body: File,
) -> StorageFileMultipartPart:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
        upload_id=upload_id,
        part_number=part_number,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    file_id: str,
    upload_id: str,
    part_number: int,
    *,
    client: httpx.AsyncClient,
    body: File,
) -> StorageFileMultipartPart:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
        upload_id=upload_id,
        part_number=part_number,
        body=body,
    )

    if isinstance(body, File):
        kwargs["content"] = body._iter_bytes()

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
