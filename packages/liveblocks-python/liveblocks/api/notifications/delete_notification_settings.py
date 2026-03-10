from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    user_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/v2/users/{user_id}/notification-settings".format(
            user_id=quote(str(user_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    user_id: str,
    *,
    client: httpx.Client,
) -> None:
    """Delete notification settings

     This endpoint deletes a user's notification settings for the project. Corresponds to
    [`liveblocks.deleteNotificationSettings`](/docs/api-reference/liveblocks-node#delete-users-userId-
    notification-settings).

    Args:
        user_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        user_id=user_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Delete notification settings

     This endpoint deletes a user's notification settings for the project. Corresponds to
    [`liveblocks.deleteNotificationSettings`](/docs/api-reference/liveblocks-node#delete-users-userId-
    notification-settings).

    Args:
        user_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        user_id=user_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
