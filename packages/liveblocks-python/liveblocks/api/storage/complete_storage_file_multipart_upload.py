from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.complete_storage_file_multipart_upload_request_body import CompleteStorageFileMultipartUploadRequestBody
from ...models.live_file_data import LiveFileData


def _get_kwargs(
    room_id: str,
    file_id: str,
    upload_id: str,
    *,
    body: CompleteStorageFileMultipartUploadRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/storage/files/{file_id}/multipart/{upload_id}/complete".format(
            room_id=quote(str(room_id), safe=""),
            file_id=quote(str(file_id), safe=""),
            upload_id=quote(str(upload_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> LiveFileData:
    if response.status_code == 200:
        response_200 = LiveFileData.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    file_id: str,
    upload_id: str,
    *,
    client: httpx.Client,
    body: CompleteStorageFileMultipartUploadRequestBody,
) -> LiveFileData:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
        upload_id=upload_id,
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
    *,
    client: httpx.AsyncClient,
    body: CompleteStorageFileMultipartUploadRequestBody,
) -> LiveFileData:
    kwargs = _get_kwargs(
        room_id=room_id,
        file_id=file_id,
        upload_id=upload_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
