from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_yjs_document_response import GetYjsDocumentResponse
from ...models.get_yjs_document_type import GetYjsDocumentType
from ...types import UNSET, Unset


def _get_kwargs(
    room_id: str,
    *,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetYjsDocumentType | Unset = UNSET,
) -> dict[str, Any]:

    params: dict[str, Any] = {}

    params["formatting"] = formatting

    params["key"] = key

    json_type_: str | Unset = UNSET
    if not isinstance(type_, Unset):
        json_type_ = type_.value

    params["type"] = json_type_

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/ydoc".format(
            room_id=quote(str(room_id), safe=""),
        ),
        "params": params,
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetYjsDocumentResponse:
    if response.status_code == 200:
        response_200 = GetYjsDocumentResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetYjsDocumentType | Unset = UNSET,
) -> GetYjsDocumentResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
        formatting=formatting,
        key=key,
        type_=type_,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
    formatting: bool | Unset = UNSET,
    key: str | Unset = UNSET,
    type_: GetYjsDocumentType | Unset = UNSET,
) -> GetYjsDocumentResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
        formatting=formatting,
        key=key,
        type_=type_,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
