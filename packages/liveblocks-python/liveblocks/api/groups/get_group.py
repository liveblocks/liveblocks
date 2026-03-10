from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.group import Group


def _get_kwargs(
    group_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/v2/groups/{group_id}".format(
            group_id=quote(str(group_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> Group:
    if response.status_code == 200:
        response_200 = Group.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    group_id: str,
    *,
    client: httpx.Client,
) -> Group:
    """Get group

     This endpoint returns a specific group by ID. Corresponds to [`liveblocks.getGroup`](/docs/api-
    reference/liveblocks-node#get-group).

    Args:
        group_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Group
    """

    kwargs = _get_kwargs(
        group_id=group_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    group_id: str,
    *,
    client: httpx.AsyncClient,
) -> Group:
    """Get group

     This endpoint returns a specific group by ID. Corresponds to [`liveblocks.getGroup`](/docs/api-
    reference/liveblocks-node#get-group).

    Args:
        group_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        Group
    """

    kwargs = _get_kwargs(
        group_id=group_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
