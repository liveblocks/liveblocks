from typing import Any

import httpx

from ... import errors
from ...models.trigger_inbox_notification import TriggerInboxNotification
from ...types import UNSET, Unset


def _get_kwargs(
    *,
    body: TriggerInboxNotification | Unset = UNSET,
) -> dict[str, Any]:
    headers: dict[str, Any] = {}

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/inbox-notifications/trigger",
    }

    if not isinstance(body, Unset):
        _kwargs["json"] = body.to_dict()

    headers["Content-Type"] = "application/json"

    _kwargs["headers"] = headers
    return _kwargs


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    *,
    client: httpx.Client,
    body: TriggerInboxNotification | Unset = UNSET,
) -> Any:
    """Trigger inbox notification

     This endpoint triggers an inbox notification. Corresponds to
    [`liveblocks.triggerInboxNotification`](/docs/api-reference/liveblocks-node#post-inbox-
    notifications-trigger).

    Args:
        body (TriggerInboxNotification | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    *,
    client: httpx.AsyncClient,
    body: TriggerInboxNotification | Unset = UNSET,
) -> Any:
    """Trigger inbox notification

     This endpoint triggers an inbox notification. Corresponds to
    [`liveblocks.triggerInboxNotification`](/docs/api-reference/liveblocks-node#post-inbox-
    notifications-trigger).

    Args:
        body (TriggerInboxNotification | Unset):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        body=body,
    )

    response = await client.request(
        **kwargs,
    )

    return None
