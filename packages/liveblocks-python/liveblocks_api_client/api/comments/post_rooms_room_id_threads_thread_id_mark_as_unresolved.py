from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    room_id: str,
    thread_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/threads/{thread_id}/mark-as-unresolved".format(
            room_id=quote(str(room_id), safe=""),
            thread_id=quote(str(thread_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.Client,
) -> None:
    """Mark thread as unresolved

     This endpoint marks a thread as unresolved.

    Args:
        room_id (str):
        thread_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
    )

    response = client.request(
        **kwargs,
    )

    return None


async def _asyncio(
    room_id: str,
    thread_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Mark thread as unresolved

     This endpoint marks a thread as unresolved.

    Args:
        room_id (str):
        thread_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        thread_id=thread_id,
    )

    response = await client.request(
        **kwargs,
    )

    return None
