from io import BytesIO
from typing import Any
from urllib.parse import quote

import httpx

from ... import errors
from ...types import File


def _get_kwargs(
    room_id: str,
    version_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "get",
        "url": "/rooms/{room_id}/version/{version_id}".format(
            room_id=quote(str(room_id), safe=""),
            version_id=quote(str(version_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> File:
    if response.status_code == 200:
        response_200 = File(payload=BytesIO(response.content))

        return response_200

    raise errors.LiveblocksError.from_response(response)


def _sync(
    room_id: str,
    version_id: str,
    *,
    client: httpx.Client,
) -> File:
    """Get Yjs document version

     This endpoint returns a specific version of the room's Yjs document encoded as a binary Yjs update.

    Args:
        room_id (str):
        version_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        File
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        version_id=version_id,
    )

    response = client.request(
        **kwargs,
    )

    return _parse_response(response=response)


async def _asyncio(
    room_id: str,
    version_id: str,
    *,
    client: httpx.AsyncClient,
) -> File:
    """Get Yjs document version

     This endpoint returns a specific version of the room's Yjs document encoded as a binary Yjs update.

    Args:
        room_id (str):
        version_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        File
    """

    kwargs = _get_kwargs(
        room_id=room_id,
        version_id=version_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
