from typing import Any

import httpx

from ... import errors
from ...models.trigger_inbox_notification_request_body import TriggerInboxNotificationRequestBody
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    body: TriggerInboxNotificationRequestBody | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/inbox-notifications/trigger",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: TriggerInboxNotificationRequestBody | Unset = UNSET,
) -> None:
    kwargs = _get_kwargs(
        body=body,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    body: TriggerInboxNotificationRequestBody | Unset = UNSET,
) -> None:
    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
