from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.initialize_storage_document_body import InitializeStorageDocumentBody
from ...models.initialize_storage_document_response import InitializeStorageDocumentResponse


def _get_kwargs(
    room_id: str,
    *,
    body: InitializeStorageDocumentBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/storage".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> InitializeStorageDocumentResponse:
    if response.status_code == 200:
        response_200 = InitializeStorageDocumentResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    body: InitializeStorageDocumentBody,
) -> InitializeStorageDocumentResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    body: InitializeStorageDocumentBody,
) -> InitializeStorageDocumentResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
