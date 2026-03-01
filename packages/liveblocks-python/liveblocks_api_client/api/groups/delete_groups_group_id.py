from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    group_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "delete",
        "url": "/groups/{group_id}".format(
            group_id=quote(str(group_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> Any:
    if response.status_code == 204:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    group_id: str,
    *,
    client: httpx.Client,
) -> Any:
    """Delete group

     This endpoint deletes a group. Corresponds to [`liveblocks.deleteGroup`](/docs/api-
    reference/liveblocks-node#delete-group).

    Args:
        group_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        group_id=group_id,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    group_id: str,
    *,
    client: httpx.AsyncClient,
) -> Any:
    """Delete group

     This endpoint deletes a group. Corresponds to [`liveblocks.deleteGroup`](/docs/api-
    reference/liveblocks-node#delete-group).

    Args:
        group_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Any
    """

    kwargs = _get_kwargs(
        group_id=group_id,
    )

    response = await client.request(
        **kwargs,
    )

    return None
