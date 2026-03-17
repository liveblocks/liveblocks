from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.mark_inbox_notification_as_read_response_200 import MarkInboxNotificationAsReadResponse200


def _get_kwargs(
    inbox_notification_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/inbox-notifications/{inbox_notification_id}/read".format(
            inbox_notification_id=quote(str(inbox_notification_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> MarkInboxNotificationAsReadResponse200:
    if response.status_code == 200:
        response_200 = MarkInboxNotificationAsReadResponse200.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    inbox_notification_id: str,
    *,
    client: httpx.Client,
) -> MarkInboxNotificationAsReadResponse200:
    kwargs = _get_kwargs(
        inbox_notification_id=inbox_notification_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    inbox_notification_id: str,
    *,
    client: httpx.AsyncClient,
) -> MarkInboxNotificationAsReadResponse200:
    kwargs = _get_kwargs(
        inbox_notification_id=inbox_notification_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
