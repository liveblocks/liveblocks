from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.attachment_with_url import AttachmentWithUrl


def _get_kwargs(
    room_id: str,
    attachment_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/attachments/{attachment_id}".format(
            room_id=quote(str(room_id), safe=""),
            attachment_id=quote(str(attachment_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> AttachmentWithUrl:
    if response.status_code == 200:
        response_200 = AttachmentWithUrl.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    attachment_id: str,
    *,
    client: httpx.Client,
) -> AttachmentWithUrl:
    kwargs = _get_kwargs(
        room_id=room_id,
        attachment_id=attachment_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    attachment_id: str,
    *,
    client: httpx.AsyncClient,
) -> AttachmentWithUrl:
    kwargs = _get_kwargs(
        room_id=room_id,
        attachment_id=attachment_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
