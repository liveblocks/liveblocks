from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.comment_attachment import CommentAttachment
from ...types import UNSET, File, Unset


def _get_kwargs(
    room_id: str,
    attachment_id: str,
    name: str,
    *,
    body: File,
    user_id: str,
    file_size: int | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    params["userId"] = user_id

    params["fileSize"] = file_size

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "put",
        "url": "/v2/rooms/{room_id}/attachments/{attachment_id}/upload/{name}".format(
            room_id=quote(str(room_id), safe=""),
            attachment_id=quote(str(attachment_id), safe=""),
            name=quote(str(name), safe=""),
        ),
        "params": params,
    }

    _kwargs["content"] = body.payload

    headers["Content-Type"] = "application/octet-stream"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> CommentAttachment:
    if response.status_code == 200:
        response_200 = CommentAttachment.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    attachment_id: str,
    name: str,
    *,
    client: httpx.Client,
    body: File,
    user_id: str,
    file_size: int | Unset = UNSET,
) -> CommentAttachment:
    kwargs = _get_kwargs(
        room_id=room_id,
        attachment_id=attachment_id,
        name=name,
        body=body,
        user_id=user_id,
        file_size=file_size,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    attachment_id: str,
    name: str,
    *,
    client: httpx.AsyncClient,
    body: File,
    user_id: str,
    file_size: int | Unset = UNSET,
) -> CommentAttachment:
    kwargs = _get_kwargs(
        room_id=room_id,
        attachment_id=attachment_id,
        name=name,
        body=body,
        user_id=user_id,
        file_size=file_size,
    )

    if isinstance(body, File):
        kwargs["content"] = body._iter_bytes()

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
