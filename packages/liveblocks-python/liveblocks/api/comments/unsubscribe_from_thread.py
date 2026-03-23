from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.unsubscribe_from_thread_request_body import UnsubscribeFromThreadRequestBody


def _get_kwargs(
    room_id: str,
    thread_id: str,
    *,
    body: UnsubscribeFromThreadRequestBody,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/rooms/{room_id}/threads/{thread_id}/unsubscribe".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.Client,
    body: UnsubscribeFromThreadRequestBody,
) -> None:
    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.AsyncClient,
    body: UnsubscribeFromThreadRequestBody,
) -> None:
    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
