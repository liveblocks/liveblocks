from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.comment_attachment import CommentAttachment
from ...models.complete_attachment_multipart_upload_request_body import CompleteAttachmentMultipartUploadRequestBody
from ...types import UNSET


def _get_kwargs(
    room_id: str,
    attachment_id: str,
    upload_id: str,
    *,
    body: CompleteAttachmentMultipartUploadRequestBody,
    user_id: str,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    params: dict[str, Any] = {}

    params["userId"] = user_id

    params = {k: v for k, v in params.items() if v is not UNSET and v is not None}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/attachments/{attachment_id}/multipart/{upload_id}/complete".format(
            room_id=quote(str(room_id), safe=""),
            attachment_id=quote(str(attachment_id), safe=""),
            upload_id=quote(str(upload_id), safe=""),
        ),
        "params": params,
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

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
    upload_id: str,
    *,
    client: httpx.Client,
    body: CompleteAttachmentMultipartUploadRequestBody,
    user_id: str,
) -> CommentAttachment:
    kwargs = _get_kwargs(
        room_id=room_id,
        attachment_id=attachment_id,
        upload_id=upload_id,
        body=body,
        user_id=user_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    attachment_id: str,
    upload_id: str,
    *,
    client: httpx.AsyncClient,
    body: CompleteAttachmentMultipartUploadRequestBody,
    user_id: str,
) -> CommentAttachment:
    kwargs = _get_kwargs(
        room_id=room_id,
        attachment_id=attachment_id,
        upload_id=upload_id,
        body=body,
        user_id=user_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
