from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    user_id: str,
    inbox_notification_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/users/{user_id}/inbox-notifications/{inbox_notification_id}".format(
            user_id=quote(str(user_id), safe=""),
            inbox_notification_id=quote(str(inbox_notification_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    user_id: str,
    inbox_notification_id: str,
    *,
    client: httpx.Client,
) -> Any:
    """Delete inbox notification

     This endpoint deletes a user’s inbox notification by its ID.

    Args:
        user_id (str):
        inbox_notification_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        inbox_notification_id=inbox_notification_id,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    user_id: str,
    inbox_notification_id: str,
    *,
    client: httpx.AsyncClient,
) -> Any:
    """Delete inbox notification

     This endpoint deletes a user’s inbox notification by its ID.

    Args:
        user_id (str):
        inbox_notification_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        user_id=user_id,
        inbox_notification_id=inbox_notification_id,
    )

    response = await client.request(
        **kwargs,
    )

    return None
