from typing import Any
from urllib.parse import quote

import httpx

from ... import errors


def _get_kwargs(
    project_id: str,
) -> dict[str, Any]:

    _kwargs: dict[str, Any] = {
        "method": "post",
        "url": "/v2/management/projects/{project_id}/api-keys/public/deactivate".format(
            project_id=quote(str(project_id), safe=""),
        ),
    }

    return _kwargs


def _parse_response(*, response: httpx.Response) -> None:
    if response.status_code == 200:
        return None

    raise errors.LiveblocksError.from_response(response)


def _sync(
    project_id: str,
    *,
    client: httpx.Client,
) -> None:
    """Deactivate public key

     Deactivates the public API key associated with the specified project. This endpoint requires the
    `write:all` scope. If the project cannot be found, a 404 error response is returned.

    Args:
        project_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        project_id=project_id,
    )

    response = client.request(
        **kwargs,
    )
    return _parse_response(response=response)


async def _asyncio(
    project_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Deactivate public key

     Deactivates the public API key associated with the specified project. This endpoint requires the
    `write:all` scope. If the project cannot be found, a 404 error response is returned.

    Args:
        project_id (str):

    Raises:
        errors.LiveblocksError: If the server returns a response with non-2xx status code.
        httpx.TimeoutException: If the request takes longer than Client.timeout.

    Returns:
        None
    """

    kwargs = _get_kwargs(
        project_id=project_id,
    )

    response = await client.request(
        **kwargs,
    )

    return _parse_response(response=response)
