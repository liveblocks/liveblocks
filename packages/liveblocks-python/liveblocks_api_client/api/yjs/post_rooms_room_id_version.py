from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...models.create_yjs_version import CreateYjsVersion


def _get_kwargs(
    room_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/rooms/{room_id}/version".format(
            room_id=quote(str(room_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> CreateYjsVersion:
    if response.status_code == 200:
        response_200 = CreateYjsVersion.from_dict(response.json())

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    *,
    client: httpx.Client,
) -> CreateYjsVersion:
    """Create Yjs version snapshot

     This endpoint creates a new version history snapshot for the room's Yjs document.

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateYjsVersion
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    *,
    client: httpx.AsyncClient,
) -> CreateYjsVersion:
    """Create Yjs version snapshot

     This endpoint creates a new version history snapshot for the room's Yjs document.

    Args:
        room_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        CreateYjsVersion
    """

    kwargs = _get_kwargs(
        room_id=room_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
