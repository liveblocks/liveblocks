from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.get_thread_inbox_notifications_response import GetThreadInboxNotificationsResponse


def _get_kwargs(
    room_id: str,
    thread_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/rooms/{room_id}/threads/{thread_id}/inbox-notifications".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> GetThreadInboxNotificationsResponse:
    if response.status_code == 200:
        response_200 = GetThreadInboxNotificationsResponse.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.Client,
) -> GetThreadInboxNotificationsResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
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
) -> GetThreadInboxNotificationsResponse:
    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
